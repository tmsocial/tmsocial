DROP INDEX users_site_username_unique;
CREATE UNIQUE INDEX users_username_unique ON users(username);