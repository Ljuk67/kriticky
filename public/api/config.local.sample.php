<?php
// Copy this file to config.local.php and fill in real values.
// Keep it out of git (already ignored). The file returns an assoc array of secrets.
return [
  // Supabase (server-side)
  'SUPABASE_URL' => 'https://YOUR-PROJECT.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY' => 'SUPABASE_SERVICE_ROLE_KEY',

  // Client-side listing (optional here; typically set as PUBLIC_ env in Astro)
  // 'PUBLIC_SUPABASE_URL' => '',
  // 'PUBLIC_SUPABASE_ANON_KEY' => '',

  // SMTP (Websupport)
  'SMTP_HOST' => 'smtp.m1.websupport.sk',
  'SMTP_PORT' => '587',
  'SMTP_SECURE' => 'starttls',
  'SMTP_USER' => 'admin@kriticky.sk',
  'SMTP_PASS' => 'REPLACE_ME',
  'SMTP_FROM' => 'admin@kriticky.sk',
  'ADMIN_NOTIFY_TO' => 'mysli@kriticky.sk',

  // Optional logging location
  // 'LOG_FILE' => '/home/USER/logs/comments.log',
  // or
  // 'LOG_DIR' => '/home/USER/logs',
];

