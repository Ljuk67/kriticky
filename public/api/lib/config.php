<?php
declare(strict_types=1);

// Simple config loader that prefers a local PHP file returning an array of secrets.
// This avoids needing host-level env vars on providers without such UI.
//
// Usage:
//   $cfg = cfg('SUPABASE_URL'); // checks local file first, then getenv()

function _cfg_cache(): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  $cache = [];
  // Allow explicit path override via GET/ENV for debugging only if file exists and is within allowed directory
  $candidates = [];
  // Default: config.local.php next to this lib directory’s parent (public/api)
  $candidates[] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config.local.php';
  // Try one level above public/ if deployed as /dist
  $candidates[] = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'config.local.php';
  foreach ($candidates as $p) {
    if (is_file($p)) {
      $arr = require $p;
      if (is_array($arr)) { $cache = $arr; break; }
    }
  }
  return $cache;
}

function cfg(string $key, ?string $default = null): ?string {
  $c = _cfg_cache();
  if (array_key_exists($key, $c)) return (string)$c[$key];
  $v = getenv($key);
  return $v === false ? $default : $v;
}

