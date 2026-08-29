import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.sun.net.httpserver.HttpExchange;

/**
 * 기상청 초단기실황 프록시 — {@code GET /api/weather?sido=}
 * <p>
 * 키: 환경변수 {@code WEATHER_SERVICE_KEY} 우선.
 */
public final class WeatherApi {

    private static final String NCST =
            "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
    private static final String FCST =
            "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final long CACHE_MS = 10 * 60 * 1000L;
    private static final Map<String, Cached> CACHE = new ConcurrentHashMap<>();

    private static final Map<String, int[]> SIDO_GRID = Map.ofEntries(
            Map.entry("서울특별시", new int[] {60, 127}),
            Map.entry("부산광역시", new int[] {98, 76}),
            Map.entry("대구광역시", new int[] {89, 90}),
            Map.entry("인천광역시", new int[] {55, 124}),
            Map.entry("광주광역시", new int[] {58, 74}),
            Map.entry("전남광주통합특별시", new int[] {58, 74}),
            Map.entry("대전광역시", new int[] {67, 100}),
            Map.entry("울산광역시", new int[] {102, 84}),
            Map.entry("세종특별자치시", new int[] {66, 103}),
            Map.entry("경기도", new int[] {60, 120}),
            Map.entry("강원특별자치도", new int[] {73, 134}),
            Map.entry("강원도", new int[] {73, 134}),
            Map.entry("충청북도", new int[] {69, 107}),
            Map.entry("충청남도", new int[] {68, 100}),
            Map.entry("전북특별자치도", new int[] {63, 89}),
            Map.entry("전라북도", new int[] {63, 89}),
            Map.entry("전라남도", new int[] {51, 67}),
            Map.entry("경상북도", new int[] {89, 91}),
            Map.entry("경상남도", new int[] {91, 77}),
            Map.entry("제주특별자치도", new int[] {52, 38}));

    private WeatherApi() {}

    public static void handle(HttpExchange ex) throws IOException {
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            respond(ex, 405, "{\"error\":\"GET only\"}");
            return;
        }
        Map<String, String> q = query(ex.getRequestURI());
        String all = q.getOrDefault("all", "").trim();
        if ("1".equals(all) || "true".equalsIgnoreCase(all)) {
            respondNationwide(ex);
            return;
        }
        String sido = q.getOrDefault("sido", "").trim();
        String label = sido.isBlank() ? "서울특별시" : sido;
        try {
            respond(ex, 200, weatherForSido(label));
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "weather error" : e.getMessage();
            respond(ex, 502, "{\"ok\":false,\"sido\":" + qstr(label) + ",\"message\":" + qstr(msg) + "}");
        }
    }

    /** 지도용 시·도 (격자 중복·구명칭 제외) */
    private static final String[] MAP_SIDOS = {
            "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
            "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
            "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
            "경상남도", "제주특별자치도"
    };

    private static void respondNationwide(HttpExchange ex) throws IOException {
        StringBuilder sb = new StringBuilder("{\"ok\":true,\"nationwide\":true,\"regions\":[");
        boolean first = true;
        for (String sido : MAP_SIDOS) {
            try {
                String one = weatherForSidoLight(sido);
                if (!first) {
                    sb.append(',');
                }
                first = false;
                sb.append(one);
            } catch (Exception e) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                sb.append("{\"ok\":false,\"sido\":").append(qstr(sido))
                        .append(",\"icon\":\"cloudy\",\"sky\":").append(qstr("정보없음"))
                        .append(",\"temp\":\"\"}");
            }
        }
        sb.append("]}");
        respond(ex, 200, sb.toString());
    }

    private static String weatherForSido(String label) throws Exception {
        int[] grid = SIDO_GRID.getOrDefault(label, new int[] {60, 127});
        String cacheKey = grid[0] + "," + grid[1];
        Cached cached = CACHE.get(cacheKey);
        long now = System.currentTimeMillis();
        if (cached != null && now - cached.at < CACHE_MS) {
            // 캐시 JSON의 sido 라벨을 요청명에 맞춤
            return cached.json.replaceFirst(
                    "\"sido\":\"[^\"]*\"",
                    "\"sido\":" + qstr(label));
        }
        String json = fetchWeatherJson(label, grid[0], grid[1], true);
        CACHE.put(cacheKey, new Cached(now, json));
        return json;
    }

    private static String weatherForSidoLight(String label) throws Exception {
        int[] grid = SIDO_GRID.getOrDefault(label, new int[] {60, 127});
        String cacheKey = "L:" + grid[0] + "," + grid[1];
        Cached cached = CACHE.get(cacheKey);
        long now = System.currentTimeMillis();
        if (cached != null && now - cached.at < CACHE_MS) {
            return cached.json.replaceFirst(
                    "\"sido\":\"[^\"]*\"",
                    "\"sido\":" + qstr(label));
        }
        // Also reuse full cache if present
        Cached full = CACHE.get(grid[0] + "," + grid[1]);
        if (full != null && now - full.at < CACHE_MS) {
            return full.json.replaceFirst(
                    "\"sido\":\"[^\"]*\"",
                    "\"sido\":" + qstr(label));
        }
        String json = fetchWeatherJson(label, grid[0], grid[1], false);
        CACHE.put(cacheKey, new Cached(now, json));
        return json;
    }

    private static String fetchWeatherJson(String sidoLabel, int nx, int ny, boolean withSkyFcst)
            throws Exception {
        LocalDateTime now = LocalDateTime.now(KST);
        LocalDateTime ncstT = now;
        if (ncstT.getMinute() < 40) {
            ncstT = ncstT.minusHours(1);
        }
        String ncstDate = ncstT.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String ncstTime = String.format(Locale.ROOT, "%02d00", ncstT.getHour());

        LocalDateTime fcstT = now;
        if (fcstT.getMinute() < 45) {
            fcstT = fcstT.minusHours(1);
        }
        String fcstDate = fcstT.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String fcstTime = String.format(Locale.ROOT, "%02d30", fcstT.getHour());

        String ncstBody = httpGet(buildUrl(NCST, ncstDate, ncstTime, nx, ny, 20));
        Map<String, String> cats = parseObsCategories(ncstBody);
        String temp = cats.getOrDefault("T1H", "");
        String pty = cats.getOrDefault("PTY", "0");
        String reh = cats.getOrDefault("REH", "");
        String wsd = cats.getOrDefault("WSD", "");
        String rn1 = cats.getOrDefault("RN1", "");

        String skyCode = "";
        if (withSkyFcst) {
            try {
                String fcstBody = httpGet(buildUrl(FCST, fcstDate, fcstTime, nx, ny, 60));
                skyCode = firstFcstValue(fcstBody, "SKY");
                if (temp.isBlank()) {
                    String t1h = firstFcstValue(fcstBody, "T1H");
                    if (!t1h.isBlank()) {
                        temp = t1h;
                    }
                }
            } catch (Exception ignored) {
                /* 실황만으로도 표시 가능 */
            }
        }

        String icon = iconFromCodes(pty, skyCode);
        String skyLabel = skyLabel(pty, skyCode);

        return "{\"ok\":true"
                + ",\"sido\":" + qstr(sidoLabel)
                + ",\"nx\":" + nx + ",\"ny\":" + ny
                + ",\"baseDate\":" + qstr(ncstDate)
                + ",\"baseTime\":" + qstr(ncstTime)
                + ",\"temp\":" + qstr(temp)
                + ",\"pty\":" + qstr(pty)
                + ",\"skyCode\":" + qstr(skyCode)
                + ",\"icon\":" + qstr(icon)
                + ",\"sky\":" + qstr(skyLabel)
                + ",\"humidity\":" + qstr(reh)
                + ",\"wind\":" + qstr(wsd)
                + ",\"rain1h\":" + qstr(rn1)
                + "}";
    }

    private static String buildUrl(String base, String date, String time, int nx, int ny, int rows) {
        return base
                + "?serviceKey=" + serviceKey()
                + "&pageNo=1&numOfRows=" + rows + "&dataType=JSON"
                + "&base_date=" + date
                + "&base_time=" + time
                + "&nx=" + nx
                + "&ny=" + ny;
    }

    private static Map<String, String> parseObsCategories(String json) {
        Map<String, String> map = new HashMap<>();
        int idx = 0;
        while (true) {
            int c = json.indexOf("\"category\"", idx);
            if (c < 0) {
                break;
            }
            String cat = extractJsonStringAfter(json, c);
            int nextCat = json.indexOf("\"category\"", c + 10);
            int v = json.indexOf("\"obsrValue\"", c);
            if (v >= 0 && (nextCat < 0 || v < nextCat)) {
                String val = extractJsonStringAfter(json, v);
                if (cat != null && !cat.isBlank()) {
                    map.put(cat, val == null ? "" : val);
                }
            }
            idx = c + 10;
        }
        return map;
    }

    /** 초단기예보: 가장 가까운 시각의 category 값 */
    private static String firstFcstValue(String json, String category) {
        String needle = "\"category\":\"" + category + "\"";
        int c = json.indexOf(needle);
        if (c < 0) {
            needle = "\"category\": \"" + category + "\"";
            c = json.indexOf(needle);
        }
        if (c < 0) {
            return "";
        }
        int v = json.indexOf("\"fcstValue\"", c);
        if (v < 0) {
            return "";
        }
        return extractJsonStringAfter(json, v);
    }

    private static String iconFromCodes(String pty, String sky) {
        String p = pty == null ? "0" : pty.trim();
        if ("1".equals(p) || "5".equals(p)) {
            return "rain";
        }
        if ("2".equals(p) || "6".equals(p)) {
            return "sleet";
        }
        if ("3".equals(p) || "7".equals(p)) {
            return "snow";
        }
        String s = sky == null ? "" : sky.trim();
        if ("1".equals(s)) {
            return "clear";
        }
        if ("3".equals(s)) {
            return "cloudy";
        }
        if ("4".equals(s)) {
            return "overcast";
        }
        return "cloudy";
    }

    private static String skyLabel(String pty, String sky) {
        String p = pty == null ? "0" : pty.trim();
        return switch (p) {
            case "1" -> "비";
            case "2" -> "비/눈";
            case "3" -> "눈";
            case "5" -> "빗방울";
            case "6" -> "빗방울눈날림";
            case "7" -> "눈날림";
            default -> switch (sky == null ? "" : sky.trim()) {
                case "1" -> "맑음";
                case "3" -> "구름많음";
                case "4" -> "흐림";
                default -> "구름많음";
            };
        };
    }

    private static String extractJsonStringAfter(String json, int keyPos) {
        int colon = json.indexOf(':', keyPos);
        if (colon < 0) {
            return "";
        }
        int i = colon + 1;
        while (i < json.length() && Character.isWhitespace(json.charAt(i))) {
            i++;
        }
        if (i >= json.length()) {
            return "";
        }
        if (json.charAt(i) == '"') {
            int end = i + 1;
            StringBuilder sb = new StringBuilder();
            while (end < json.length()) {
                char ch = json.charAt(end);
                if (ch == '\\' && end + 1 < json.length()) {
                    sb.append(json.charAt(end + 1));
                    end += 2;
                    continue;
                }
                if (ch == '"') {
                    break;
                }
                sb.append(ch);
                end++;
            }
            return sb.toString();
        }
        int end = i;
        while (end < json.length()) {
            char ch = json.charAt(end);
            if (ch == ',' || ch == '}' || Character.isWhitespace(ch)) {
                break;
            }
            end++;
        }
        return json.substring(i, end);
    }

    private static String serviceKey() {
        String key = System.getenv("WEATHER_SERVICE_KEY");
        if (key == null || key.isBlank()) {
            key = "710a0030105c2b193aadfe1c2b574a087424bcb3587be2ec1d15a0fe8f10d240";
        }
        return key;
    }

    private static String httpGet(String urlString) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) URI.create(urlString).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(8_000);
        conn.setReadTimeout(15_000);
        int code = conn.getResponseCode();
        InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        if (in == null) {
            throw new IOException("HTTP " + code);
        }
        String body = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        if (code >= 400) {
            throw new IOException("HTTP " + code);
        }
        if (body.contains("SERVICE ERROR") || body.contains("\"resultCode\":\"03\"")) {
            throw new IOException("기상청 API 인증 오류");
        }
        if (body.contains("\"resultCode\"") && !body.contains("\"resultCode\":\"00\"")) {
            throw new IOException("기상청 API 응답 오류");
        }
        return body;
    }

    private static void respond(HttpExchange ex, int code, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(code, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.close();
    }

    private static Map<String, String> query(URI uri) {
        Map<String, String> map = new HashMap<>();
        String raw = uri.getRawQuery();
        if (raw == null || raw.isBlank()) {
            return map;
        }
        for (String part : raw.split("&")) {
            int eq = part.indexOf('=');
            if (eq < 0) {
                map.put(dec(part), "");
            } else {
                map.put(dec(part.substring(0, eq)), dec(part.substring(eq + 1)));
            }
        }
        return map;
    }

    private static String dec(String s) {
        try {
            return URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }

    private static String qstr(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    private static final class Cached {
        final long at;
        final String json;

        Cached(long at, String json) {
            this.at = at;
            this.json = json;
        }
    }
}
