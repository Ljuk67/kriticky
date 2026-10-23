<?php
// Copy to private/server.php beside web/, outside every served web root.
// KRITICKY_CONFIG_FILE can override the default with an absolute private path.
// Prefer PHP server environment variables. Never put this file in public/ or dist/.
return [
  // Site base URL (used to build verification and redirect links)
  'SITE_BASE_URL' => 'https://kriticky.sk',

  // Supabase (server-side)
  'SUPABASE_URL' => 'https://YOUR-PROJECT.supabase.co',
  'SUPABASE_SECRET_KEY' => 'SUPABASE_SECRET_KEY',

  // Client-side listing (optional here; typically set as PUBLIC_ env in Astro)
  // 'PUBLIC_SUPABASE_URL' => '',
  // 'PUBLIC_SUPABASE_PUBLISHABLE_KEY' => '',

  // SMTP (Websupport)
  'SMTP_HOST' => 'smtp.m1.websupport.sk',
  'SMTP_PORT' => '587',
  'SMTP_SECURE' => 'starttls',
  'SMTP_USER' => 'admin@kriticky.sk',
  'SMTP_PASS' => 'REPLACE_ME',
  'SMTP_FROM' => 'admin@kriticky.sk',
  'SMTP_FROM_NAME' => 'Kriticky.sk',
  'ADMIN_NOTIFY_TO' => 'mysli@kriticky.sk',

  // Optional logging location
  // 'LOG_FILE' => '/home/USER/logs/comments.log',
  // or
  // 'LOG_DIR' => '/home/USER/logs',
];
