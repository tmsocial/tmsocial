DROP INDEX participations_contest_user_unique;
DROP TABLE participations;

DROP INDEX users_username_unique;
DROP TABLE users;

ALTER TABLE tasks
DROP COLUMN contest_id;

DROP INDEX contests_name_unique;
DROP TABLE contests;

DROP INDEX sites_domain_unique;
DROP TABLE sites;