import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Member / Post / Reply / Recommendation / Location JDBC 접근.
 */
public final class BoardDb {

    private static final Path DB_PROPERTIES = Path.of("db.properties");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter REG_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");
    private static volatile boolean schemaReady = false;

    private BoardDb() {
    }

    public static Connection open() throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        DbConfig cfg = DbConfig.load();
        Connection conn = DriverManager.getConnection(cfg.jdbcUrl, cfg.username, cfg.password);
        ensureSchema(conn);
        return conn;
    }

    /** Post.category 컬럼이 없으면 추가 (내국인/외국인 분리) */
    private static void ensureSchema(Connection conn) {
        if (schemaReady) {
            return;
        }
        synchronized (BoardDb.class) {
            if (schemaReady) {
                return;
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate(
                        "ALTER TABLE Post ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'DOMESTIC'");
            } catch (SQLException e) {
                // 이미 있으면 무시 (MySQL 1060 duplicate column)
                String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
                if (!(e.getErrorCode() == 1060 || msg.contains("duplicate"))) {
                    System.err.println("Post.category 확인: " + e.getMessage());
                }
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("ALTER TABLE Member ADD COLUMN profile_image MEDIUMTEXT");
            } catch (SQLException e) {
                String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
                if (!(e.getErrorCode() == 1060 || msg.contains("duplicate"))) {
                    System.err.println("Member.profile_image 확인: " + e.getMessage());
                }
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("ALTER TABLE Member MODIFY COLUMN profile_image MEDIUMTEXT");
            } catch (SQLException e) {
                System.err.println("Member.profile_image 확장: " + e.getMessage());
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("""
                        CREATE TABLE IF NOT EXISTS MemberFollow (
                          follower_id VARCHAR(40) NOT NULL,
                          following_id VARCHAR(40) NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (follower_id, following_id)
                        )
                        """);
            } catch (SQLException e) {
                System.err.println("MemberFollow 확인: " + e.getMessage());
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("""
                        CREATE TABLE IF NOT EXISTS TravelCourse (
                          course_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          member_id VARCHAR(40) NOT NULL,
                          title VARCHAR(200) NOT NULL,
                          summary VARCHAR(500),
                          cover_image VARCHAR(500),
                          reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                        """);
            } catch (SQLException e) {
                System.err.println("TravelCourse 확인: " + e.getMessage());
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("ALTER TABLE TravelCourse ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0");
            } catch (SQLException e) {
                /* duplicate column */
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("ALTER TABLE TravelCourse ADD COLUMN source_course_id BIGINT NULL");
            } catch (SQLException e) {
                /* duplicate column */
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("""
                        CREATE TABLE IF NOT EXISTS CourseSpot (
                          course_id BIGINT NOT NULL,
                          seq_no INT NOT NULL,
                          post_id BIGINT NULL,
                          title VARCHAR(200),
                          address VARCHAR(200),
                          image_url VARCHAR(500),
                          note VARCHAR(500),
                          res_nm VARCHAR(200),
                          sido VARCHAR(100),
                          PRIMARY KEY (course_id, seq_no)
                        )
                        """);
            } catch (SQLException e) {
                System.err.println("CourseSpot 확인: " + e.getMessage());
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("ALTER TABLE CourseSpot MODIFY COLUMN post_id BIGINT NULL");
            } catch (SQLException e) {
                /* ignore */
            }
            for (String col : List.of(
                    "title VARCHAR(200)",
                    "address VARCHAR(200)",
                    "image_url VARCHAR(500)",
                    "note VARCHAR(500)",
                    "res_nm VARCHAR(200)",
                    "sido VARCHAR(100)")) {
                try (Statement st = conn.createStatement()) {
                    st.executeUpdate("ALTER TABLE CourseSpot ADD COLUMN " + col);
                } catch (SQLException e) {
                    /* duplicate column */
                }
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("""
                        CREATE TABLE IF NOT EXISTS CourseSave (
                          member_id VARCHAR(40) NOT NULL,
                          course_id BIGINT NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (member_id, course_id)
                        )
                        """);
            } catch (SQLException e) {
                System.err.println("CourseSave 확인: " + e.getMessage());
            }
            try (Statement st = conn.createStatement()) {
                st.executeUpdate("""
                        CREATE TABLE IF NOT EXISTS CourseLike (
                          member_id VARCHAR(40) NOT NULL,
                          course_id BIGINT NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (member_id, course_id)
                        )
                        """);
            } catch (SQLException e) {
                System.err.println("CourseLike 확인: " + e.getMessage());
            }
            schemaReady = true;
        }
    }

    public static Map<String, String> login(String memberId, String password) throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT member_id, nickname, profile_image FROM Member WHERE member_id = ? AND password = ?")) {
            ps.setString(1, memberId);
            ps.setString(2, password);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                return memberRow(rs);
            }
        }
    }

    /** 회원가입. 성공 시 memberId·nickname 반환 */
    public static Map<String, String> register(String memberId, String password, String nickname)
            throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("아이디를 입력하세요.");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("비밀번호를 입력하세요.");
        }
        String id = memberId.trim();
        String nick = (nickname == null || nickname.isBlank()) ? id : nickname.trim();
        if (id.length() > 40) {
            throw new IllegalArgumentException("아이디는 40자 이내로 입력하세요.");
        }
        try (Connection conn = open()) {
            try (PreparedStatement check = conn.prepareStatement(
                    "SELECT 1 FROM Member WHERE member_id = ? LIMIT 1")) {
                check.setString(1, id);
                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next()) {
                        throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
                    }
                }
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO Member (member_id, password, nickname) VALUES (?, ?, ?)")) {
                ps.setString(1, id);
                ps.setString(2, password);
                ps.setString(3, nick);
                ps.executeUpdate();
                }
                Map<String, String> out = new LinkedHashMap<>();
            out.put("memberId", id);
            out.put("nickname", nick);
            out.put("profileImage", "");
                return out;
        }
    }

    public static Map<String, String> getMember(String memberId) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            return null;
        }
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT member_id, nickname, profile_image FROM Member WHERE member_id = ?")) {
            ps.setString(1, memberId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? memberRow(rs) : null;
            }
        }
    }

    public static Map<String, String> updateProfileImage(String memberId, String profileImage)
            throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        String url = profileImage == null ? "" : profileImage.trim();
        if (!url.isEmpty()
                && !url.startsWith("/uploads/")
                && !url.startsWith("data:image/")) {
            throw new IllegalArgumentException("잘못된 이미지 경로입니다.");
        }
        if (url.startsWith("data:image/") && url.length() > 900_000) {
            throw new IllegalArgumentException("이미지가 너무 큽니다. 더 작은 사진으로 올려 주세요.");
        }
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE Member SET profile_image = ? WHERE member_id = ?")) {
            ps.setString(1, url.isEmpty() ? null : url);
            ps.setString(2, memberId.trim());
            if (ps.executeUpdate() == 0) {
                throw new IllegalArgumentException("회원을 찾을 수 없습니다.");
            }
        }
        return getMember(memberId);
    }

    /** DB에 저장된 원본 (data URL 또는 /uploads/…). 공개 JSON에는 {@link #toPublicProfileImage} 사용. */
    public static String getRawProfileImage(String memberId) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            return "";
        }
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT profile_image FROM Member WHERE member_id = ?")) {
            ps.setString(1, memberId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return "";
                }
                return nullToEmpty(rs.getString("profile_image"));
            }
        }
    }

    /** 클라이언트용 URL — data URL은 엔드포인트로 치환해 목록 JSON이 비대해지지 않게 함 */
    public static String toPublicProfileImage(String memberId, String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        if (raw.startsWith("/uploads/")) {
            return raw;
        }
        if (raw.startsWith("data:image/") && memberId != null && !memberId.isBlank()) {
            return "/api/profile/photo?memberId="
                    + java.net.URLEncoder.encode(memberId.trim(), java.nio.charset.StandardCharsets.UTF_8);
        }
        return "";
    }

    private static Map<String, String> memberRow(ResultSet rs) throws SQLException {
        Map<String, String> out = new LinkedHashMap<>();
        String memberId = rs.getString("member_id");
        out.put("memberId", memberId);
        out.put("nickname", nullToEmpty(rs.getString("nickname")));
        out.put("profileImage", toPublicProfileImage(memberId, rs.getString("profile_image")));
        return out;
    }

    private static final String POST_SELECT = """
            SELECT p.post_id, p.member_id, p.content, p.reg_date, p.category,
                   m.nickname, m.profile_image,
                       l.location_id, l.title AS location_title, l.address, l.image_url,
                       (SELECT COUNT(*) FROM Recommendation r WHERE r.post_id = p.post_id) AS recommend_count,
                       (SELECT COUNT(*) FROM Reply rp WHERE rp.post_id = p.post_id) AS reply_count
                FROM Post p
                JOIN Member m ON m.member_id = p.member_id
                LEFT JOIN Location l ON l.location_id = p.location_id
            """;

    public static List<Map<String, Object>> listPosts(String viewerId, String category) throws Exception {
        return listPosts(viewerId, category, "", "");
    }

    /**
     * @param sido 도/시 필터 (address 컬럼에 저장된 시·도, 빈 문자열이면 전체)
     * @param q 장소명(location title) 부분 검색
     */
    public static List<Map<String, Object>> listPosts(
            String viewerId, String category, String sido, String q) throws Exception {
        String cat = normalizeCategory(category);
        String sidoFilter = sido == null ? "" : sido.trim();
        String query = q == null ? "" : q.trim();

        StringBuilder sql = new StringBuilder(POST_SELECT);
        sql.append(" WHERE p.category = ? ");
        if (!sidoFilter.isEmpty()) {
            sql.append(" AND (")
                    .append("COALESCE(l.address, '') = ? OR COALESCE(l.address, '') LIKE ? ")
                    .append("OR COALESCE(l.address, '') LIKE ?")
                    .append(") ");
        }
        if (!query.isEmpty()) {
            sql.append(" AND COALESCE(l.title, '') LIKE ? ");
        }
        sql.append(" ORDER BY COALESCE(l.address, ''), p.reg_date DESC, p.post_id DESC ");

        return queryPosts(sql.toString(), viewerId, ps -> {
            int i = 1;
            ps.setString(i++, cat);
            if (!sidoFilter.isEmpty()) {
                ps.setString(i++, sidoFilter);
                ps.setString(i++, sidoFilter + "%");
                ps.setString(i++, "%" + sidoFilter + "%");
            }
            if (!query.isEmpty()) {
                ps.setString(i, "%" + query + "%");
            }
        });
    }

    /** 특정 회원이 쓴 글 */
    public static List<Map<String, Object>> listPostsByAuthor(String viewerId, String authorId) throws Exception {
        if (authorId == null || authorId.isBlank()) {
            throw new IllegalArgumentException("작성자 아이디가 필요합니다.");
        }
        String sql = POST_SELECT + """
                WHERE p.member_id = ?
                ORDER BY p.reg_date DESC, p.post_id DESC
                """;
        return queryPosts(sql, viewerId, ps -> ps.setString(1, authorId.trim()));
    }

    /** 특정 회원이 추천한 글 */
    public static List<Map<String, Object>> listRecommendedPosts(String viewerId, String likerId) throws Exception {
        if (likerId == null || likerId.isBlank()) {
            throw new IllegalArgumentException("회원 아이디가 필요합니다.");
        }
        String sql = POST_SELECT + """
                JOIN Recommendation rec ON rec.post_id = p.post_id
                WHERE rec.member_id = ?
                ORDER BY p.reg_date DESC, p.post_id DESC
                """;
        return queryPosts(sql, viewerId, ps -> ps.setString(1, likerId.trim()));
    }

    @FunctionalInterface
    private interface PsBinder {
        void bind(PreparedStatement ps) throws SQLException;
    }

    private static List<Map<String, Object>> queryPosts(String sql, String viewerId, PsBinder binder)
            throws Exception {
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            binder.bind(ps);
            try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Map<String, Object> row = postRow(rs);
                long postId = ((Number) row.get("postId")).longValue();
                row.put("recommended", viewerId != null && !viewerId.isBlank()
                        && hasRecommendation(conn, viewerId, postId));
                list.add(row);
                }
            }
        }
        return list;
    }

    public static Map<String, Object> getPost(long postId, String viewerId) throws Exception {
        String sql = POST_SELECT + " WHERE p.post_id = ? ";
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, postId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                Map<String, Object> row = postRow(rs);
                row.put("recommended", viewerId != null && !viewerId.isBlank()
                        && hasRecommendation(conn, viewerId, postId));
                row.put("replies", listReplies(conn, postId));
                return row;
            }
        }
    }

    public static long createPost(
            String memberId,
            String content,
            String locationTitle,
            String address,
            String category,
            String imageUrl)
            throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("내용을 입력하세요.");
        }
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("도/시를 선택하세요.");
        }
        if (locationTitle == null || locationTitle.isBlank()) {
            throw new IllegalArgumentException("장소명을 입력하세요.");
        }
        String cat = normalizeCategory(category);
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                ensureMember(conn, memberId);
                String title = locationTitle.trim();
                long locationId = insertLocation(
                        conn,
                        title,
                        address.trim(),
                        imageUrl == null ? "" : imageUrl.trim());
                long postId;
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO Post (member_id, location_id, content, category) VALUES (?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setString(1, memberId);
                    ps.setLong(2, locationId);
                    ps.setString(3, content.trim());
                    ps.setString(4, cat);
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        if (!keys.next()) {
                            throw new SQLException("post_id 생성 실패");
                        }
                        postId = keys.getLong(1);
                    }
                }
                conn.commit();
                return postId;
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    /** 본인 글만 수정. imageUrl이 null이면 기존 사진 유지, 빈 문자열이면 사진 제거 */
    public static void updatePost(
            long postId,
            String memberId,
            String content,
            String locationTitle,
            String address,
            String category,
            String imageUrl)
            throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("내용을 입력하세요.");
        }
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("도/시를 선택하세요.");
        }
        if (locationTitle == null || locationTitle.isBlank()) {
            throw new IllegalArgumentException("장소명을 입력하세요.");
        }
        String cat = normalizeCategory(category);
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                ensureMember(conn, memberId);
                Long locationId = null;
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT member_id, location_id FROM Post WHERE post_id = ?")) {
                    ps.setLong(1, postId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("게시글이 없습니다.");
                        }
                        if (!memberId.equals(rs.getString("member_id"))) {
                            throw new IllegalArgumentException("본인 글만 수정할 수 있습니다.");
                        }
                        long loc = rs.getLong("location_id");
                        if (!rs.wasNull()) {
                            locationId = loc;
                        }
                    }
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE Post SET content = ?, category = ? WHERE post_id = ?")) {
                    ps.setString(1, content.trim());
                    ps.setString(2, cat);
                    ps.setLong(3, postId);
                    ps.executeUpdate();
                }
                if (locationId != null) {
                    String title = locationTitle.trim();
                    String addr = address.trim();
                    if (imageUrl == null) {
                        try (PreparedStatement ps = conn.prepareStatement(
                                "UPDATE Location SET title = ?, address = ? WHERE location_id = ?")) {
                            ps.setString(1, title);
                            ps.setString(2, addr);
                            ps.setLong(3, locationId);
                            ps.executeUpdate();
                        }
                    } else {
                        try (PreparedStatement ps = conn.prepareStatement(
                                "UPDATE Location SET title = ?, address = ?, image_url = ? WHERE location_id = ?")) {
                            ps.setString(1, title);
                            ps.setString(2, addr);
                            ps.setString(3, imageUrl.isBlank() ? null : imageUrl.trim());
                            ps.setLong(4, locationId);
                            ps.executeUpdate();
                        }
                    }
                }
                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    /** 본인 글만 삭제 (댓글·추천 포함) */
    public static void deletePost(long postId, String memberId) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT member_id FROM Post WHERE post_id = ?")) {
                    ps.setLong(1, postId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("게시글이 없습니다.");
                        }
                        if (!memberId.equals(rs.getString("member_id"))) {
                            throw new IllegalArgumentException("본인 글만 삭제할 수 있습니다.");
                        }
                    }
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM Recommendation WHERE post_id = ?")) {
                    ps.setLong(1, postId);
                    ps.executeUpdate();
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM Reply WHERE post_id = ?")) {
                    ps.setLong(1, postId);
                    ps.executeUpdate();
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM Post WHERE post_id = ? AND member_id = ?")) {
                    ps.setLong(1, postId);
                    ps.setString(2, memberId);
                    int n = ps.executeUpdate();
                    if (n == 0) {
                        throw new IllegalArgumentException("삭제에 실패했습니다.");
                    }
                }
                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    public static boolean toggleRecommend(String memberId, long postId) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        try (Connection conn = open()) {
            ensureMember(conn, memberId);
            ensurePost(conn, postId);
            if (hasRecommendation(conn, memberId, postId)) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM Recommendation WHERE member_id = ? AND post_id = ?")) {
                    ps.setString(1, memberId);
                    ps.setLong(2, postId);
                    ps.executeUpdate();
                }
                return false;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO Recommendation (member_id, post_id) VALUES (?, ?)")) {
                ps.setString(1, memberId);
                ps.setLong(2, postId);
                ps.executeUpdate();
            }
            return true;
        }
    }

    public static long addReply(String memberId, long postId, String content) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("댓글을 입력하세요.");
        }
        try (Connection conn = open()) {
            ensureMember(conn, memberId);
            ensurePost(conn, postId);
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO Reply (post_id, member_id, reply_content) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, postId);
                ps.setString(2, memberId);
                ps.setString(3, content.trim());
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (!keys.next()) {
                        throw new SQLException("reply_id 생성 실패");
                    }
                    return keys.getLong(1);
                }
            }
        }
    }

    private static List<Map<String, Object>> listReplies(Connection conn, long postId) throws SQLException {
        String sql = """
                SELECT r.reply_id, r.post_id, r.member_id, r.reply_content, r.reg_date, m.nickname
                FROM Reply r
                JOIN Member m ON m.member_id = r.member_id
                WHERE r.post_id = ?
                ORDER BY r.reg_date ASC, r.reply_id ASC
                """;
        List<Map<String, Object>> list = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, postId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("replyId", rs.getLong("reply_id"));
                    row.put("postId", rs.getLong("post_id"));
                    row.put("memberId", rs.getString("member_id"));
                    row.put("nickname", nullToEmpty(rs.getString("nickname")));
                    row.put("content", nullToEmpty(rs.getString("reply_content")));
                    row.put("regDate", formatRegDate(rs, "reg_date"));
                    row.put("regAt", readRegAtMillis(rs, "reg_date"));
                    list.add(row);
                }
            }
        }
        return list;
    }

    private static Map<String, Object> postRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("postId", rs.getLong("post_id"));
        String memberId = rs.getString("member_id");
        row.put("memberId", memberId);
        row.put("nickname", nullToEmpty(rs.getString("nickname")));
        row.put("profileImage", toPublicProfileImage(memberId, rs.getString("profile_image")));
        row.put("content", nullToEmpty(rs.getString("content")));
        row.put("category", normalizeCategory(rs.getString("category")));
        row.put("regDate", formatRegDate(rs, "reg_date"));
        row.put("regAt", readRegAtMillis(rs, "reg_date"));
        long locId = rs.getLong("location_id");
        row.put("locationId", rs.wasNull() ? null : locId);
        row.put("locationTitle", nullToEmpty(rs.getString("location_title")));
        row.put("address", nullToEmpty(rs.getString("address")));
        row.put("imageUrl", nullToEmpty(rs.getString("image_url")));
        row.put("recommendCount", rs.getLong("recommend_count"));
        row.put("replyCount", rs.getLong("reply_count"));
        return row;
    }

    /**
     * RDS DATETIME은 UTC 벽시계로 저장됨(세션 time_zone=UTC).
     * getTimestamp()+Asia/Seoul 해석하면 9시간 밀리므로 문자열을 UTC Instant로 읽는다.
     */
    private static Instant readRegInstant(ResultSet rs, String column) throws SQLException {
        String raw = rs.getString(column);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim();
        if (s.length() >= 19) {
            s = s.substring(0, 19);
        }
        LocalDateTime ldt = LocalDateTime.parse(s.replace(' ', 'T'));
        return ldt.toInstant(ZoneOffset.UTC);
    }

    private static Long readRegAtMillis(ResultSet rs, String column) throws SQLException {
        Instant instant = readRegInstant(rs, column);
        return instant == null ? null : instant.toEpochMilli();
    }

    /** 한국시간(+09:00) 표시용 */
    private static String formatRegDate(ResultSet rs, String column) throws SQLException {
        Instant instant = readRegInstant(rs, column);
        if (instant == null) {
            return "";
        }
        return instant.atZone(KST).format(REG_DATE_FMT);
    }

    private static String normalizeCategory(String category) {
        if (category != null && "FOREIGN".equalsIgnoreCase(category.trim())) {
            return "FOREIGN";
        }
        return "DOMESTIC";
    }

    private static boolean hasRecommendation(Connection conn, String memberId, long postId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM Recommendation WHERE member_id = ? AND post_id = ? LIMIT 1")) {
            ps.setString(1, memberId);
            ps.setLong(2, postId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static void ensureMember(Connection conn, String memberId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM Member WHERE member_id = ? LIMIT 1")) {
            ps.setString(1, memberId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalArgumentException("존재하지 않는 회원입니다: " + memberId);
                }
            }
        }
    }

    private static void ensurePost(Connection conn, long postId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM Post WHERE post_id = ? LIMIT 1")) {
            ps.setLong(1, postId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalArgumentException("게시글이 없습니다: " + postId);
                }
            }
        }
    }

    public static long countPostsByAuthor(String authorId) throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT COUNT(*) FROM Post WHERE member_id = ?")) {
            ps.setString(1, authorId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    public static long countFollowers(String memberId) throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT COUNT(*) FROM MemberFollow WHERE following_id = ?")) {
            ps.setString(1, memberId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    public static long countFollowing(String memberId) throws Exception {
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT COUNT(*) FROM MemberFollow WHERE follower_id = ?")) {
            ps.setString(1, memberId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    public static boolean isFollowing(String followerId, String followingId) throws Exception {
        if (followerId == null || followerId.isBlank() || followingId == null || followingId.isBlank()) {
            return false;
        }
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT 1 FROM MemberFollow WHERE follower_id = ? AND following_id = ? LIMIT 1")) {
            ps.setString(1, followerId.trim());
            ps.setString(2, followingId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    /** 팔로우 토글. true = 팔로우 상태 */
    public static boolean toggleFollow(String followerId, String followingId) throws Exception {
        if (followerId == null || followerId.isBlank() || followingId == null || followingId.isBlank()) {
            throw new IllegalArgumentException("회원 정보가 필요합니다.");
        }
        String a = followerId.trim();
        String b = followingId.trim();
        if (a.equals(b)) {
            throw new IllegalArgumentException("자기 자신은 팔로우할 수 없습니다.");
        }
        try (Connection conn = open()) {
            ensureMember(conn, a);
            ensureMember(conn, b);
            if (isFollowingConn(conn, a, b)) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM MemberFollow WHERE follower_id = ? AND following_id = ?")) {
                    ps.setString(1, a);
                    ps.setString(2, b);
                    ps.executeUpdate();
                }
                return false;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO MemberFollow (follower_id, following_id) VALUES (?, ?)")) {
                ps.setString(1, a);
                ps.setString(2, b);
                ps.executeUpdate();
            }
            return true;
        }
    }

    private static boolean isFollowingConn(Connection conn, String a, String b) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM MemberFollow WHERE follower_id = ? AND following_id = ? LIMIT 1")) {
            ps.setString(1, a);
            ps.setString(2, b);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public static List<Map<String, String>> listFollowers(String memberId) throws Exception {
        return listFollowSide(memberId, true);
    }

    public static List<Map<String, String>> listFollowing(String memberId) throws Exception {
        return listFollowSide(memberId, false);
    }

    private static List<Map<String, String>> listFollowSide(String memberId, boolean followers)
            throws Exception {
        String sql = followers
                ? """
                  SELECT m.member_id, m.nickname, m.profile_image
                  FROM MemberFollow f
                  JOIN Member m ON m.member_id = f.follower_id
                  WHERE f.following_id = ?
                  ORDER BY f.created_at DESC
                  """
                : """
                  SELECT m.member_id, m.nickname, m.profile_image
                  FROM MemberFollow f
                  JOIN Member m ON m.member_id = f.following_id
                  WHERE f.follower_id = ?
                  ORDER BY f.created_at DESC
                  """;
        List<Map<String, String>> out = new ArrayList<>();
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, memberId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(memberRow(rs));
                }
            }
        }
        return out;
    }

    public static List<Map<String, Object>> listCourses(String ownerId, String viewerId) throws Exception {
        if (ownerId == null || ownerId.isBlank()) {
            throw new IllegalArgumentException("회원 아이디가 필요합니다.");
        }
        String sql = """
                SELECT c.course_id, c.member_id, c.title, c.summary, c.cover_image, c.reg_date,
                       c.is_public,
                       m.nickname, m.profile_image,
                       (SELECT COUNT(*) FROM CourseSpot s WHERE s.course_id = c.course_id) AS spot_count,
                       (SELECT COUNT(*) FROM CourseLike lk WHERE lk.course_id = c.course_id) AS like_count,
                       (SELECT COUNT(*) FROM CourseSave sv WHERE sv.course_id = c.course_id) AS save_count
                FROM TravelCourse c
                JOIN Member m ON m.member_id = c.member_id
                WHERE c.member_id = ?
                ORDER BY c.reg_date DESC, c.course_id DESC
                """;
        List<Map<String, Object>> out = new ArrayList<>();
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, ownerId.trim());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(courseListRow(conn, rs, viewerId));
                }
            }
        }
        return out;
    }

    public static Map<String, Object> getCourse(long courseId, String viewerId) throws Exception {
        String sql = """
                SELECT c.course_id, c.member_id, c.title, c.summary, c.cover_image, c.reg_date,
                       c.is_public,
                       m.nickname, m.profile_image,
                       (SELECT COUNT(*) FROM CourseSpot s WHERE s.course_id = c.course_id) AS spot_count,
                       (SELECT COUNT(*) FROM CourseLike lk WHERE lk.course_id = c.course_id) AS like_count,
                       (SELECT COUNT(*) FROM CourseSave sv WHERE sv.course_id = c.course_id) AS save_count
                FROM TravelCourse c
                JOIN Member m ON m.member_id = c.member_id
                WHERE c.course_id = ?
                """;
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                Map<String, Object> course = courseListRow(conn, rs, viewerId);
                boolean isPublic = Boolean.TRUE.equals(course.get("isPublic"));
                String owner = nullToEmpty((String) course.get("memberId"));
                String viewer = viewerId == null ? "" : viewerId.trim();
                if (!isPublic && !owner.equals(viewer)) {
                    return null;
                }
                course.put("spots", listCourseSpots(conn, courseId, viewerId));
                return course;
            }
        }
    }

    private static Map<String, Object> courseListRow(Connection conn, ResultSet rs, String viewerId)
            throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        long courseId = rs.getLong("course_id");
        String memberId = rs.getString("member_id");
        row.put("courseId", courseId);
        row.put("memberId", memberId);
        row.put("nickname", nullToEmpty(rs.getString("nickname")));
        row.put("profileImage", toPublicProfileImage(memberId, rs.getString("profile_image")));
        row.put("title", nullToEmpty(rs.getString("title")));
        row.put("summary", nullToEmpty(rs.getString("summary")));
        String cover = nullToEmpty(rs.getString("cover_image"));
        if (cover.isEmpty()) {
            cover = firstSpotImage(conn, courseId);
        }
        row.put("coverImage", cover);
        row.put("regDate", formatRegDate(rs, "reg_date"));
        row.put("regAt", readRegAtMillis(rs, "reg_date"));
        row.put("spotCount", rs.getLong("spot_count"));
        row.put("likeCount", rs.getLong("like_count"));
        row.put("saveCount", rs.getLong("save_count"));
        row.put("liked", viewerId != null && !viewerId.isBlank() && hasCourseLike(conn, viewerId, courseId));
        Long myCourseId = null;
        if (viewerId != null && !viewerId.isBlank()) {
            myCourseId = findCloneBySource(conn, viewerId.trim(), courseId);
        }
        row.put("myCourseId", myCourseId);
        // 내 계획으로 복사된 경우만 saved (구 CourseSave 북마크만 있으면 false → 다시 저장 가능)
        row.put("saved", myCourseId != null);
        boolean isPublic = false;
        try {
            isPublic = rs.getInt("is_public") == 1;
        } catch (SQLException ignored) {
            /* older schema */
        }
        row.put("isPublic", isPublic);
        return row;
    }

    public static List<Map<String, Object>> listPublicCourses(String viewerId, int limit) throws Exception {
        int lim = Math.max(1, Math.min(limit <= 0 ? 50 : limit, 100));
        String sql = """
                SELECT c.course_id, c.member_id, c.title, c.summary, c.cover_image, c.reg_date,
                       c.is_public,
                       m.nickname, m.profile_image,
                       (SELECT COUNT(*) FROM CourseSpot s WHERE s.course_id = c.course_id) AS spot_count,
                       (SELECT COUNT(*) FROM CourseLike lk WHERE lk.course_id = c.course_id) AS like_count,
                       (SELECT COUNT(*) FROM CourseSave sv WHERE sv.course_id = c.course_id) AS save_count
                FROM TravelCourse c
                JOIN Member m ON m.member_id = c.member_id
                WHERE c.is_public = 1
                ORDER BY c.reg_date DESC, c.course_id DESC
                LIMIT ?
                """;
        List<Map<String, Object>> out = new ArrayList<>();
        try (Connection conn = open();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, lim);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(courseListRow(conn, rs, viewerId));
                }
            }
        }
        return out;
    }

    public static boolean setCoursePublic(long courseId, String memberId, boolean isPublic) throws Exception {
        try (Connection conn = open()) {
            String owner = courseOwner(conn, courseId);
            if (owner == null) {
                throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
            }
            if (!owner.equals(memberId == null ? "" : memberId.trim())) {
                throw new IllegalArgumentException("본인 코스만 공유할 수 있습니다.");
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE TravelCourse SET is_public = ? WHERE course_id = ?")) {
                ps.setInt(1, isPublic ? 1 : 0);
                ps.setLong(2, courseId);
                ps.executeUpdate();
            }
            return isPublic;
        }
    }

    private static String firstSpotImage(Connection conn, long courseId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("""
                SELECT l.image_url
                FROM CourseSpot s
                JOIN Post p ON p.post_id = s.post_id
                LEFT JOIN Location l ON l.location_id = p.location_id
                WHERE s.course_id = ?
                ORDER BY s.seq_no ASC
                LIMIT 1
                """)) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return nullToEmpty(rs.getString("image_url"));
                }
            }
        }
        return "";
    }

    private static List<Map<String, Object>> listCourseSpots(Connection conn, long courseId, String viewerId)
            throws SQLException {
        String sql = """
                SELECT s.seq_no, s.post_id, s.title AS spot_title, s.address AS spot_address,
                       s.image_url AS spot_image, s.note AS spot_note, s.res_nm, s.sido,
                       p.post_id AS p_post_id, p.member_id, p.content, p.reg_date, p.category,
                       m.nickname, m.profile_image,
                       l.location_id, l.title AS location_title, l.address, l.image_url,
                       (SELECT COUNT(*) FROM Recommendation r WHERE r.post_id = p.post_id) AS recommend_count,
                       (SELECT COUNT(*) FROM Reply rp WHERE rp.post_id = p.post_id) AS reply_count
                FROM CourseSpot s
                LEFT JOIN Post p ON p.post_id = s.post_id
                LEFT JOIN Member m ON m.member_id = p.member_id
                LEFT JOIN Location l ON l.location_id = p.location_id
                WHERE s.course_id = ?
                ORDER BY s.seq_no ASC
                """;
        List<Map<String, Object>> spots = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> spot = new LinkedHashMap<>();
                    int seq = rs.getInt("seq_no");
                    spot.put("seq", seq);
                    long postId = rs.getLong("post_id");
                    boolean hasPost = !rs.wasNull() && postId > 0;
                    if (hasPost) {
                        spot.put("postId", postId);
                        spot.put("memberId", nullToEmpty(rs.getString("member_id")));
                        spot.put("nickname", nullToEmpty(rs.getString("nickname")));
                        spot.put("profileImage",
                                toPublicProfileImage(rs.getString("member_id"), rs.getString("profile_image")));
                        spot.put("content", nullToEmpty(rs.getString("content")));
                        spot.put("locationTitle", nullToEmpty(rs.getString("location_title")));
                        spot.put("address", nullToEmpty(rs.getString("address")));
                        spot.put("imageUrl", nullToEmpty(rs.getString("image_url")));
                        spot.put("recommendCount", rs.getLong("recommend_count"));
                        if (viewerId != null && !viewerId.isBlank()) {
                            spot.put("recommended", hasRecommendation(conn, viewerId.trim(), postId));
                        } else {
                            spot.put("recommended", false);
                        }
                    } else {
                        spot.put("postId", null);
                        spot.put("memberId", "");
                        spot.put("nickname", "");
                        spot.put("profileImage", "");
                        spot.put("content", nullToEmpty(rs.getString("spot_note")));
                        spot.put("locationTitle", nullToEmpty(rs.getString("spot_title")));
                        spot.put("address", nullToEmpty(rs.getString("spot_address")));
                        spot.put("imageUrl", nullToEmpty(rs.getString("spot_image")));
                        spot.put("recommendCount", 0L);
                        spot.put("recommended", false);
                        spot.put("resNm", nullToEmpty(rs.getString("res_nm")));
                        spot.put("sido", nullToEmpty(rs.getString("sido")));
                    }
                    spots.add(spot);
                }
            }
        }
        return spots;
    }

    private static boolean hasCourseLike(Connection conn, String memberId, long courseId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM CourseLike WHERE member_id = ? AND course_id = ? LIMIT 1")) {
            ps.setString(1, memberId.trim());
            ps.setLong(2, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static boolean hasCourseSave(Connection conn, String memberId, long courseId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM CourseSave WHERE member_id = ? AND course_id = ? LIMIT 1")) {
            ps.setString(1, memberId.trim());
            ps.setLong(2, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public static long createCourse(String memberId, String title, String summary, String coverImage,
                                    List<Long> postIds) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("코스 제목을 입력하세요.");
        }
        List<Long> ids = postIds == null ? List.of() : postIds;
        if (ids.size() > 20) {
            throw new IllegalArgumentException("장소는 20개까지 넣을 수 있습니다.");
        }
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                ensureMember(conn, memberId.trim());
                for (Long pid : ids) {
                    if (pid == null) {
                        throw new IllegalArgumentException("잘못된 게시글입니다.");
                    }
                    ensurePost(conn, pid);
                }
                long courseId;
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO TravelCourse (member_id, title, summary, cover_image) VALUES (?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setString(1, memberId.trim());
                    ps.setString(2, title.trim());
                    ps.setString(3, summary == null || summary.isBlank() ? null : summary.trim());
                    String cover = coverImage == null ? "" : coverImage.trim();
                    ps.setString(4, cover.isEmpty() ? null : cover);
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        if (!keys.next()) {
                            throw new SQLException("course id 생성 실패");
                        }
                        courseId = keys.getLong(1);
                    }
                }
                if (!ids.isEmpty()) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO CourseSpot (course_id, seq_no, post_id) VALUES (?, ?, ?)")) {
                        int seq = 1;
                        for (Long pid : ids) {
                            ps.setLong(1, courseId);
                            ps.setInt(2, seq++);
                            ps.setLong(3, pid);
                            ps.addBatch();
                        }
                        ps.executeBatch();
                    }
                }
                conn.commit();
                return courseId;
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    /** 게시글 또는 AI 장소를 코스에 담기 */
    public static int addCourseSpot(
            long courseId,
            String memberId,
            Long postId,
            String title,
            String address,
            String imageUrl,
            String note,
            String resNm,
            String sido) throws Exception {
        try (Connection conn = open()) {
            String owner = courseOwner(conn, courseId);
            if (owner == null) {
                throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
            }
            if (!owner.equals(memberId == null ? "" : memberId.trim())) {
                throw new IllegalArgumentException("본인 코스에만 담을 수 있습니다.");
            }
            int count = spotCount(conn, courseId);
            if (count >= 20) {
                throw new IllegalArgumentException("장소는 20개까지 넣을 수 있습니다.");
            }
            int nextSeq = count + 1;
            if (postId != null && postId > 0) {
                ensurePost(conn, postId);
                if (hasPostInCourse(conn, courseId, postId)) {
                    throw new IllegalArgumentException("이미 코스에 담긴 장소입니다.");
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO CourseSpot (course_id, seq_no, post_id) VALUES (?, ?, ?)")) {
                    ps.setLong(1, courseId);
                    ps.setInt(2, nextSeq);
                    ps.setLong(3, postId);
                    ps.executeUpdate();
                }
            } else {
                String t = title == null ? "" : title.trim();
                if (t.isEmpty()) {
                    throw new IllegalArgumentException("장소명이 필요합니다.");
                }
                String rn = resNm == null ? "" : resNm.trim();
                String sd = sido == null ? "" : sido.trim();
                if (!rn.isEmpty() && hasGemInCourse(conn, courseId, rn, sd)) {
                    throw new IllegalArgumentException("이미 코스에 담긴 장소입니다.");
                }
                try (PreparedStatement ps = conn.prepareStatement("""
                        INSERT INTO CourseSpot
                          (course_id, seq_no, post_id, title, address, image_url, note, res_nm, sido)
                        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
                        """)) {
                    ps.setLong(1, courseId);
                    ps.setInt(2, nextSeq);
                    ps.setString(3, t);
                    ps.setString(4, blankToNull(address));
                    ps.setString(5, blankToNull(imageUrl));
                    ps.setString(6, blankToNull(note));
                    ps.setString(7, blankToNull(resNm));
                    ps.setString(8, blankToNull(sido));
                    ps.executeUpdate();
                }
            }
            // cover 비어 있으면 첫 이미지로
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT cover_image FROM TravelCourse WHERE course_id = ?")) {
                ps.setLong(1, courseId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && (rs.getString("cover_image") == null || rs.getString("cover_image").isBlank())) {
                        String cover = imageUrl;
                        if (postId != null && postId > 0) {
                            cover = firstSpotImage(conn, courseId);
                        }
                        if (cover != null && !cover.isBlank()) {
                            try (PreparedStatement up = conn.prepareStatement(
                                    "UPDATE TravelCourse SET cover_image = ? WHERE course_id = ?")) {
                                up.setString(1, cover.trim());
                                up.setLong(2, courseId);
                                up.executeUpdate();
                            }
                        }
                    }
                }
            }
            return nextSeq;
        }
    }

    /** 코스에서 구간(스팟) 삭제 후 seq 재정렬 */
    public static void removeCourseSpot(long courseId, String memberId, int seq) throws Exception {
        removeCourseSpots(courseId, memberId, List.of(seq));
    }

    /** 여러 구간 삭제 후 1부터 재번호 */
    public static void removeCourseSpots(long courseId, String memberId, List<Integer> seqs) throws Exception {
        if (seqs == null || seqs.isEmpty()) {
            throw new IllegalArgumentException("삭제할 구간을 선택하세요.");
        }
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                String owner = courseOwner(conn, courseId);
                if (owner == null) {
                    throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
                }
                if (!owner.equals(memberId == null ? "" : memberId.trim())) {
                    throw new IllegalArgumentException("본인 코스의 구간만 삭제할 수 있습니다.");
                }
                int deleted = 0;
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM CourseSpot WHERE course_id = ? AND seq_no = ?")) {
                    for (Integer seq : seqs) {
                        if (seq == null || seq < 1) {
                            continue;
                        }
                        ps.setLong(1, courseId);
                        ps.setInt(2, seq);
                        deleted += ps.executeUpdate();
                    }
                }
                if (deleted == 0) {
                    throw new IllegalArgumentException("해당 구간을 찾을 수 없습니다.");
                }
                List<Integer> remain = new ArrayList<>();
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT seq_no FROM CourseSpot WHERE course_id = ? ORDER BY seq_no ASC")) {
                    ps.setLong(1, courseId);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            remain.add(rs.getInt(1));
                        }
                    }
                }
                // PK 충돌 피하려고 임시 큰 번호로 이동 후 1..N 재부여
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE CourseSpot SET seq_no = ? WHERE course_id = ? AND seq_no = ?")) {
                    for (int i = 0; i < remain.size(); i++) {
                        ps.setInt(1, 10000 + i);
                        ps.setLong(2, courseId);
                        ps.setInt(3, remain.get(i));
                        ps.executeUpdate();
                    }
                    for (int i = 0; i < remain.size(); i++) {
                        ps.setInt(1, i + 1);
                        ps.setLong(2, courseId);
                        ps.setInt(3, 10000 + i);
                        ps.executeUpdate();
                    }
                }
                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private static int spotCount(Connection conn, long courseId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM CourseSpot WHERE course_id = ?")) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    private static boolean hasPostInCourse(Connection conn, long courseId, long postId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM CourseSpot WHERE course_id = ? AND post_id = ? LIMIT 1")) {
            ps.setLong(1, courseId);
            ps.setLong(2, postId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static boolean hasGemInCourse(Connection conn, long courseId, String resNm, String sido)
            throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM CourseSpot WHERE course_id = ? AND res_nm = ? AND COALESCE(sido,'') = ? LIMIT 1")) {
            ps.setLong(1, courseId);
            ps.setString(2, resNm);
            ps.setString(3, sido);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static String blankToNull(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return s.trim();
    }

    public static void updateCourse(long courseId, String memberId, String title, String summary,
                                    String coverImage, List<Long> postIds) throws Exception {
        try (Connection conn = open()) {
            String owner = courseOwner(conn, courseId);
            if (owner == null) {
                throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
            }
            if (!owner.equals(memberId == null ? "" : memberId.trim())) {
                throw new IllegalArgumentException("본인 코스만 수정할 수 있습니다.");
            }
            if (title == null || title.isBlank()) {
                throw new IllegalArgumentException("코스 제목을 입력하세요.");
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE TravelCourse SET title = ?, summary = ?, cover_image = ? WHERE course_id = ?")) {
                ps.setString(1, title.trim());
                ps.setString(2, summary == null || summary.isBlank() ? null : summary.trim());
                String cover = coverImage == null ? "" : coverImage.trim();
                ps.setString(3, cover.isEmpty() ? null : cover);
                ps.setLong(4, courseId);
                ps.executeUpdate();
            }
            // postIds 가 오면(레거시) 전체 교체 — 없으면 제목만 수정
            if (postIds != null && !postIds.isEmpty()) {
                conn.setAutoCommit(false);
                try {
                    for (Long pid : postIds) {
                        ensurePost(conn, pid);
                    }
                    try (PreparedStatement ps = conn.prepareStatement(
                            "DELETE FROM CourseSpot WHERE course_id = ?")) {
                        ps.setLong(1, courseId);
                        ps.executeUpdate();
                    }
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO CourseSpot (course_id, seq_no, post_id) VALUES (?, ?, ?)")) {
                        int seq = 1;
                        for (Long pid : postIds) {
                            ps.setLong(1, courseId);
                            ps.setInt(2, seq++);
                            ps.setLong(3, pid);
                            ps.addBatch();
                        }
                        ps.executeBatch();
                    }
                    conn.commit();
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                } finally {
                    conn.setAutoCommit(true);
                }
            }
        }
    }

    public static void deleteCourse(long courseId, String memberId) throws Exception {
        try (Connection conn = open()) {
            String owner = courseOwner(conn, courseId);
            if (owner == null) {
                throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
            }
            if (!owner.equals(memberId == null ? "" : memberId.trim())) {
                throw new IllegalArgumentException("본인 코스만 삭제할 수 있습니다.");
            }
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM CourseSpot WHERE course_id = ?")) {
                ps.setLong(1, courseId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM CourseLike WHERE course_id = ?")) {
                ps.setLong(1, courseId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM CourseSave WHERE course_id = ?")) {
                ps.setLong(1, courseId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM TravelCourse WHERE course_id = ?")) {
                ps.setLong(1, courseId);
                ps.executeUpdate();
            }
        }
    }

    private static String courseOwner(Connection conn, long courseId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT member_id FROM TravelCourse WHERE course_id = ?")) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("member_id") : null;
            }
        }
    }

    public static boolean toggleCourseLike(String memberId, long courseId) throws Exception {
        return toggleCourseFlag(memberId, courseId, true);
    }

    public static boolean toggleCourseSave(String memberId, long courseId) throws Exception {
        return toggleCourseFlag(memberId, courseId, false);
    }

    /**
     * 공개 계획을 내 여행 계획으로 복사.
     * 이미 같은 원본을 저장한 적 있으면 그 복사본을 갱신하고 id 반환.
     */
    public static long savePublicCourseToMine(
            long sourceCourseId, String memberId, String titleOverride, String summaryOverride) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        String me = memberId.trim();
        try (Connection conn = open()) {
            conn.setAutoCommit(false);
            try {
                ensureMember(conn, me);
                String owner;
                String srcTitle;
                String srcSummary;
                String srcCover;
                boolean isPublic;
                try (PreparedStatement ps = conn.prepareStatement("""
                        SELECT member_id, title, summary, cover_image, COALESCE(is_public, 0) AS is_public
                        FROM TravelCourse WHERE course_id = ?
                        """)) {
                    ps.setLong(1, sourceCourseId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
                        }
                        owner = nullToEmpty(rs.getString("member_id"));
                        srcTitle = nullToEmpty(rs.getString("title"));
                        srcSummary = nullToEmpty(rs.getString("summary"));
                        srcCover = nullToEmpty(rs.getString("cover_image"));
                        isPublic = rs.getInt("is_public") == 1;
                    }
                }
                if (me.equals(owner)) {
                    throw new IllegalArgumentException("내가 만든 계획입니다. 내 여행 계획에서 확인하세요.");
                }
                if (!isPublic) {
                    throw new IllegalArgumentException("공유된 계획만 저장할 수 있습니다.");
                }

                String title = titleOverride != null && !titleOverride.isBlank()
                        ? titleOverride.trim()
                        : srcTitle;
                if (title.isBlank()) {
                    title = "저장된 계획";
                }
                String summary = summaryOverride != null ? summaryOverride.trim() : srcSummary;
                if (summary != null && summary.isBlank()) {
                    summary = null;
                }

                Long existingId = findCloneBySource(conn, me, sourceCourseId);
                if (existingId != null) {
                    try (PreparedStatement up = conn.prepareStatement(
                            "UPDATE TravelCourse SET title = ?, summary = ? WHERE course_id = ? AND member_id = ?")) {
                        up.setString(1, title);
                        up.setString(2, summary);
                        up.setLong(3, existingId);
                        up.setString(4, me);
                        up.executeUpdate();
                    }
                    ensureCourseSave(conn, me, sourceCourseId);
                    conn.commit();
                    return existingId;
                }

                long newId;
                try (PreparedStatement ps = conn.prepareStatement(
                        """
                        INSERT INTO TravelCourse (member_id, title, summary, cover_image, is_public, source_course_id)
                        VALUES (?, ?, ?, ?, 0, ?)
                        """,
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.setString(1, me);
                    ps.setString(2, title);
                    ps.setString(3, summary);
                    ps.setString(4, srcCover.isBlank() ? null : srcCover);
                    ps.setLong(5, sourceCourseId);
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        if (!keys.next()) {
                            throw new SQLException("course id 생성 실패");
                        }
                        newId = keys.getLong(1);
                    }
                } catch (SQLException insertEx) {
                    String msg = insertEx.getMessage() == null ? "" : insertEx.getMessage().toLowerCase();
                    boolean schemaGap = msg.contains("unknown column")
                            || msg.contains("source_course_id")
                            || msg.contains("is_public");
                    if (!schemaGap) {
                        throw insertEx;
                    }
                    // source_course_id / is_public 없는 구스키마 폴백
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO TravelCourse (member_id, title, summary, cover_image) VALUES (?, ?, ?, ?)",
                            Statement.RETURN_GENERATED_KEYS)) {
                        ps.setString(1, me);
                        ps.setString(2, title);
                        ps.setString(3, summary);
                        ps.setString(4, srcCover.isBlank() ? null : srcCover);
                        ps.executeUpdate();
                        try (ResultSet keys = ps.getGeneratedKeys()) {
                            if (!keys.next()) {
                                throw new SQLException("course id 생성 실패");
                            }
                            newId = keys.getLong(1);
                        }
                    }
                    try (PreparedStatement up = conn.prepareStatement(
                            "UPDATE TravelCourse SET is_public = 0, source_course_id = ? WHERE course_id = ?")) {
                        up.setLong(1, sourceCourseId);
                        up.setLong(2, newId);
                        up.executeUpdate();
                    } catch (SQLException ignored) {
                        /* columns may still be missing */
                    }
                }

                try (PreparedStatement ps = conn.prepareStatement("""
                        INSERT INTO CourseSpot
                          (course_id, seq_no, post_id, title, address, image_url, note, res_nm, sido)
                        SELECT ?, seq_no, post_id, title, address, image_url, note, res_nm, sido
                        FROM CourseSpot WHERE course_id = ?
                        ORDER BY seq_no ASC
                        """)) {
                    ps.setLong(1, newId);
                    ps.setLong(2, sourceCourseId);
                    ps.executeUpdate();
                }
                ensureCourseSave(conn, me, sourceCourseId);
                conn.commit();
                return newId;
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private static Long findCloneBySource(Connection conn, String memberId, long sourceCourseId)
            throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT course_id FROM TravelCourse WHERE member_id = ? AND source_course_id = ? LIMIT 1")) {
            ps.setString(1, memberId);
            ps.setLong(2, sourceCourseId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        } catch (SQLException e) {
            /* source_course_id 없을 수 있음 */
        }
        return null;
    }

    private static void ensureCourseSave(Connection conn, String memberId, long courseId) throws SQLException {
        if (hasCourseSave(conn, memberId, courseId)) {
            return;
        }
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO CourseSave (member_id, course_id) VALUES (?, ?)")) {
            ps.setString(1, memberId);
            ps.setLong(2, courseId);
            ps.executeUpdate();
        }
    }

    private static boolean toggleCourseFlag(String memberId, long courseId, boolean like) throws Exception {
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        String table = like ? "CourseLike" : "CourseSave";
        try (Connection conn = open()) {
            ensureMember(conn, memberId.trim());
            if (courseOwner(conn, courseId) == null) {
                throw new IllegalArgumentException("코스를 찾을 수 없습니다.");
            }
            boolean on = like ? hasCourseLike(conn, memberId, courseId) : hasCourseSave(conn, memberId, courseId);
            if (on) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "DELETE FROM " + table + " WHERE member_id = ? AND course_id = ?")) {
                    ps.setString(1, memberId.trim());
                    ps.setLong(2, courseId);
                    ps.executeUpdate();
                }
                return false;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO " + table + " (member_id, course_id) VALUES (?, ?)")) {
                ps.setString(1, memberId.trim());
                ps.setLong(2, courseId);
                ps.executeUpdate();
            }
            return true;
        }
    }

    private static long insertLocation(Connection conn, String title, String address, String imageUrl)
            throws SQLException {
        long nextId;
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT COALESCE(MAX(location_id), 0) + 1 AS next_id FROM Location")) {
            rs.next();
            nextId = rs.getLong("next_id");
        }
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO Location (location_id, title, address, tel, image_url) VALUES (?, ?, ?, NULL, ?)")) {
            ps.setLong(1, nextId);
            ps.setString(2, title);
            ps.setString(3, address.isBlank() ? null : address);
            ps.setString(4, imageUrl.isBlank() ? null : imageUrl);
            ps.executeUpdate();
            return nextId;
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static final class DbConfig {
        final String jdbcUrl;
        final String username;
        final String password;

        DbConfig(String jdbcUrl, String username, String password) {
            this.jdbcUrl = jdbcUrl;
            this.username = username;
            this.password = password;
        }

        static DbConfig load() throws IOException {
            Properties props = new Properties();
            if (Files.isRegularFile(DB_PROPERTIES)) {
                try (InputStream in = Files.newInputStream(DB_PROPERTIES)) {
                    props.load(in);
                }
            }
            String url = firstNonBlank(System.getenv("MYSQL_URL"), props.getProperty("db.url"), "");
            String username = firstNonBlank(System.getenv("MYSQL_USER"), props.getProperty("db.username"), "min");
            String password = firstNonBlank(System.getenv("MYSQL_PASSWORD"), props.getProperty("db.password"), "");
            if (url.isBlank() || password.isBlank()) {
                throw new IOException("db.properties 또는 MYSQL_* 환경변수를 설정하세요.");
            }
            return new DbConfig(url, username, password);
        }

        private static String firstNonBlank(String... values) {
            for (String v : values) {
                if (v != null && !v.isBlank()) {
                    return v.trim();
                }
            }
            return "";
        }
    }
}
