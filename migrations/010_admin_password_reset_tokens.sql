-- Admin self-service password reset — mirrors password_reset_tokens (§3.1):
-- SHA-256 of the raw token, 30-minute expiry, single use.

CREATE TABLE admin_password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_aprt_admin (admin_user_id),
  KEY idx_aprt_token (token_hash),
  CONSTRAINT fk_aprt_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
