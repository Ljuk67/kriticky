<?php
// Minimal SMTP (STARTTLS) mail sender without external deps.
// Uses env: SMTP_HOST, SMTP_PORT, SMTP_SECURE=starttls|smtps|none, SMTP_USER, SMTP_PASS, SMTP_FROM

declare(strict_types=1);

function smtp_env(string $k, ?string $d=null): ?string { $v = getenv($k); return $v === false ? $d : $v; }

function smtp_send_mail(string $to, string $subject, string $textBody, string $htmlBody): void {
  $host = (string)smtp_env('SMTP_HOST', 'localhost');
  $port = (int)(smtp_env('SMTP_PORT', '587'));
  $secure = strtolower((string)smtp_env('SMTP_SECURE', 'starttls'));
  $user = (string)smtp_env('SMTP_USER', '');
  $pass = (string)smtp_env('SMTP_PASS', '');
  $from = (string)smtp_env('SMTP_FROM', $user ?: 'no-reply@localhost');
  $fromName = (string)smtp_env('SMTP_FROM_NAME', '');

  $sock = stream_socket_client("tcp://$host:$port", $errno, $errstr, 10);
  if (!$sock) throw new Exception("SMTP connect failed: $errstr ($errno)");
  stream_set_timeout($sock, 10);

  $read = function() use ($sock) {
    $resp = '';
    while (!feof($sock)) {
      $line = fgets($sock, 515);
      if ($line === false) break;
      $resp .= $line;
      if (strlen($line) >= 4 && $line[3] === ' ') break; // last line
    }
    return $resp;
  };
  $write = function(string $cmd) use ($sock) { fwrite($sock, $cmd . "\r\n"); };

  $banner = $read();
  if (strpos($banner, '220') !== 0) throw new Exception('SMTP bad banner: ' . $banner);

  $ehloHost = 'kriticky.sk';
  $write('EHLO ' . $ehloHost);
  $ehloResp = $read();
  if (strpos($ehloResp, '250') !== 0) throw new Exception('SMTP EHLO failed: ' . $ehloResp);

  if ($secure === 'starttls') {
    $write('STARTTLS');
    $tlsResp = $read();
    if (strpos($tlsResp, '220') !== 0) throw new Exception('SMTP STARTTLS failed: ' . $tlsResp);
    if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
      throw new Exception('SMTP TLS negotiation failed');
    }
    // Re-EHLO after STARTTLS
    $write('EHLO ' . $ehloHost);
    $ehloResp = $read();
    if (strpos($ehloResp, '250') !== 0) throw new Exception('SMTP EHLO after TLS failed: ' . $ehloResp);
  }

  if ($user !== '') {
    $write('AUTH LOGIN');
    $auth1 = $read();
    if (strpos($auth1, '334') !== 0) throw new Exception('SMTP AUTH stage1 failed: ' . $auth1);
    $write(base64_encode($user));
    $auth2 = $read();
    if (strpos($auth2, '334') !== 0) throw new Exception('SMTP AUTH stage2 failed: ' . $auth2);
    $write(base64_encode($pass));
    $auth3 = $read();
    if (strpos($auth3, '235') !== 0) throw new Exception('SMTP AUTH failed: ' . $auth3);
  }

  $fromAddr = $from;
  $toAddr = $to;

  $write('MAIL FROM: <' . $fromAddr . '>');
  $mf = $read();
  if (strpos($mf, '250') !== 0) throw new Exception('SMTP MAIL FROM failed: ' . $mf);
  $write('RCPT TO: <' . $toAddr . '>');
  $rt = $read();
  if (strpos($rt, '250') !== 0 && strpos($rt, '251') !== 0) throw new Exception('SMTP RCPT TO failed: ' . $rt);
  $write('DATA');
  $dataResp = $read();
  if (strpos($dataResp, '354') !== 0) throw new Exception('SMTP DATA not accepted: ' . $dataResp);

  $boundary = 'bnd_' . bin2hex(random_bytes(8));
  $headers = [];
  $headers[] = 'From: ' . format_address($from, $fromName);
  $headers[] = 'To: ' . $to;
  $headers[] = 'Subject: ' . encode_subject($subject);
  $headers[] = 'MIME-Version: 1.0';
  $headers[] = 'Content-Type: multipart/alternative; boundary=' . $boundary;

  $msg = implode("\r\n", $headers) . "\r\n\r\n";
  $msg .= '--' . $boundary . "\r\n";
  $msg .= "Content-Type: text/plain; charset=utf-8\r\n\r\n" . rtrim($textBody) . "\r\n";
  $msg .= '--' . $boundary . "\r\n";
  $msg .= "Content-Type: text/html; charset=utf-8\r\n\r\n" . $htmlBody . "\r\n";
  $msg .= '--' . $boundary . "--\r\n";

  // Dot-stuff and end with <CRLF>.<CRLF>
  $lines = preg_split("/(\r\n|\r|\n)/", $msg);
  foreach ($lines as $line) {
    if (strlen($line) > 0 && $line[0] === '.') $line = '.' . $line;
    fwrite($sock, $line . "\r\n");
  }
  fwrite($sock, ".\r\n");
  $endData = $read();
  if (strpos($endData, '250') !== 0) throw new Exception('SMTP message not accepted: ' . $endData);

  $write('QUIT');
  $read();
  fclose($sock);
}

function encode_subject(string $s): string {
  // RFC 2047 encoded-word (UTF-8 Base64)
  return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function format_address(string $email, string $name = ''): string {
  $email = trim($email);
  $name = trim($name);
  if ($name === '') return '<' . $email . '>';
  $needsEnc = (bool)preg_match('/[^\x20-\x7E]/', $name);
  $disp = $needsEnc ? encode_subject($name) : '"' . addcslashes($name, '"') . '"';
  return $disp . ' <' . $email . '>';
}
