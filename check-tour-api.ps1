#Requires -Version 5.1
# 방문통계 API(openapi.tour.go.kr) 연결 점검 — 인증키/대량 호출 없음

$ErrorActionPreference = "Continue"
$TargetHost = "openapi.tour.go.kr"
$CompareHosts = @(
    @{ Name = "apis.data.go.kr"; Port = 443 },
    @{ Name = "www.data.go.kr"; Port = 443 },
    @{ Name = "www.google.com"; Port = 443 }
)

function Write-Section([string]$title) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host (" " + $title) -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Test-TcpPort([string]$computer, [int]$port, [int]$ms = 5000) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($computer, $port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne($ms, $false)
        if (-not $ok) {
            return @{ Ok = $false; Detail = "TIMEOUT (${ms}ms)" }
        }
        $client.EndConnect($iar)
        return @{ Ok = $true; Detail = "OK" }
    } catch {
        return @{ Ok = $false; Detail = "FAIL: $($_.Exception.Message)" }
    } finally {
        try { $client.Close() } catch {}
    }
}

function Test-Http([string]$url, [int]$timeoutMs = 10000) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "GET"
        $req.Timeout = $timeoutMs
        $req.ReadWriteTimeout = $timeoutMs
        $req.UserAgent = "HiddenGem-Check/1.0"
        $req.AllowAutoRedirect = $true
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $resp = $req.GetResponse()
        $sw.Stop()
        $code = [int]$resp.StatusCode
        $resp.Close()
        return @{ Ok = $true; Detail = "HTTP $code ($($sw.ElapsedMilliseconds)ms)" }
    } catch {
        $msg = $_.Exception.Message
        if ($_.Exception.InnerException) {
            $msg = "$msg | $($_.Exception.InnerException.Message)"
        }
        return @{ Ok = $false; Detail = $msg }
    }
}

Write-Host "HiddenGem - Tour 방문통계 API 연결 점검" -ForegroundColor Yellow
Write-Host ("시각: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("대상: " + $TargetHost)

Write-Section "1. DNS"
$ips = @()
try {
    $dns = Resolve-DnsName $TargetHost -Type A -ErrorAction Stop
    foreach ($r in $dns) {
        if ($r.IPAddress) {
            $ips += $r.IPAddress
            Write-Host ("  A  {0,-20} TTL={1}" -f $r.IPAddress, $r.TTL) -ForegroundColor Green
        }
    }
} catch {
    Write-Host ("  DNS 실패: " + $_.Exception.Message) -ForegroundColor Red
}

foreach ($resolver in @("8.8.8.8", "1.1.1.1")) {
    try {
        $out = nslookup $TargetHost $resolver 2>&1 | Out-String
        Write-Host ("  nslookup @" + $resolver + ":")
        ($out -split "`n") | Where-Object { $_ -match "Address:|Name:" } | Select-Object -Last 4 | ForEach-Object {
            Write-Host ("    " + $_.Trim())
        }
    } catch {
        Write-Host ("  nslookup @" + $resolver + " 실패") -ForegroundColor DarkYellow
    }
}

Write-Section "2. TCP 연결"
foreach ($port in @(80, 443)) {
    $r = Test-TcpPort $TargetHost $port 5000
    $color = if ($r.Ok) { "Green" } else { "Red" }
    Write-Host ("  {0}:{1,-3}  {2}" -f $TargetHost, $port, $r.Detail) -ForegroundColor $color
}
if ($ips.Count -gt 0) {
    $ip = $ips[0]
    $r = Test-TcpPort $ip 80 5000
    $color = if ($r.Ok) { "Green" } else { "Red" }
    Write-Host ("  {0}:80   {1}  (IP 직접)" -f $ip, $r.Detail) -ForegroundColor $color
}

Write-Host ""
Write-Host "  비교 호스트:"
foreach ($h in $CompareHosts) {
    $r = Test-TcpPort $h.Name $h.Port 5000
    $color = if ($r.Ok) { "Green" } else { "Red" }
    Write-Host ("  {0}:{1,-3}  {2}" -f $h.Name, $h.Port, $r.Detail) -ForegroundColor $color
}

Write-Section "3. HTTP (연결만, API 키 없음)"
$urls = @(
    "http://openapi.tour.go.kr/",
    "https://openapi.tour.go.kr/",
    "https://apis.data.go.kr/",
    "https://www.data.go.kr/"
)
foreach ($u in $urls) {
    $r = Test-Http $u 10000
    $color = if ($r.Ok) { "Green" } else { "Red" }
    Write-Host ("  " + $u)
    Write-Host ("    -> " + $r.Detail) -ForegroundColor $color
}

Write-Section "4. traceroute (최대 15홉)"
$traceTarget = if ($ips.Count -gt 0) { $ips[0] } else { $TargetHost }
Write-Host ("  대상: " + $traceTarget)
Write-Host "  (끝에서 * 가 계속이면 상대 서버/그 구간 무응답)"
try {
    tracert -d -h 15 -w 1000 $traceTarget 2>&1 | ForEach-Object { Write-Host ("  " + $_) }
} catch {
    Write-Host ("  traceroute 실패: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Section "5. hosts 파일"
$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$hits = @()
if (Test-Path $hostsPath) {
    $hits = @(Select-String -Path $hostsPath -Pattern "tour\.go\.kr|210\.108\.46" -ErrorAction SilentlyContinue)
}
if ($hits.Count -gt 0) {
    Write-Host "  관련 항목 발견:" -ForegroundColor Yellow
    $hits | ForEach-Object { Write-Host ("    " + $_.Line.Trim()) -ForegroundColor Yellow }
} else {
    Write-Host "  tour.go.kr / 210.108.46 관련 항목 없음 (정상)" -ForegroundColor Green
}

Write-Section "6. 프록시"
try {
    netsh winhttp show proxy 2>&1 | ForEach-Object { Write-Host ("  " + $_) }
} catch {
    Write-Host "  WinHTTP 프록시 조회 실패"
}
Write-Host ("  HTTP_PROXY  = " + $env:HTTP_PROXY)
Write-Host ("  HTTPS_PROXY = " + $env:HTTPS_PROXY)
Write-Host ("  NO_PROXY    = " + $env:NO_PROXY)

Write-Section "7. 판정"
$tour80 = Test-TcpPort $TargetHost 80 5000
$data443 = Test-TcpPort "apis.data.go.kr" 443 5000

if (-not $tour80.Ok -and $data443.Ok) {
    Write-Host "  판정: openapi.tour.go.kr 만 실패 / 인터넷·data.go.kr 는 정상" -ForegroundColor Yellow
    Write-Host "  -> 앱·키·db.properties 문제가 아님. 방문통계 호스트(또는 경로) 장애" -ForegroundColor Yellow
    Write-Host "  다음:" -ForegroundColor Yellow
    Write-Host "    - 다른 네트워크에서 같은 URL 열어보기" -ForegroundColor Yellow
    Write-Host "    - data.go.kr 에 장애 문의" -ForegroundColor Yellow
    Write-Host "    - 복구될 때까지 대기 (재시작·키 교체 무의미)" -ForegroundColor Yellow
} elseif (-not $tour80.Ok -and -not $data443.Ok) {
    Write-Host "  판정: 외부 HTTPS도 실패 -> PC/랜/방화벽/ISP 문제 가능" -ForegroundColor Red
    Write-Host "  -> VPN·백신·방화벽·공유기 점검" -ForegroundColor Red
} elseif ($tour80.Ok) {
    Write-Host "  판정: TCP 연결 OK - 브라우저/서버 다시 시도" -ForegroundColor Green
    Write-Host "  -> 연결 후에도 API 에러면 키·응답 코드 확인" -ForegroundColor Green
} else {
    Write-Host "  판정: 위 로그를 확인하세요" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "점검 끝." -ForegroundColor Cyan