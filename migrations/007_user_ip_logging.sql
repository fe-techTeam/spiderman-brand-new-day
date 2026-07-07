-- IP logging (client request): persist the signup IP and the latest login IP
-- on the user row, plus a full per-event history (signup + every login) in
-- user_ip_logs. VARCHAR(45) fits a full IPv6 address.

ALTER TABLE users
  ADD COLUMN signup_ip VARCHAR(45) NULL AFTER country,
  ADD COLUMN last_login_ip VARCHAR(45) NULL AFTER signup_ip;

CREATE TABLE user_ip_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  event ENUM('signup','login') NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_uil_user (user_id, id DESC),
  KEY idx_uil_ip (ip),
  CONSTRAINT fk_uil_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
