DROP INDEX users_username_unique;
CREATE UNIQUE INDEX users_site_username_unique ON users(site_id, username);