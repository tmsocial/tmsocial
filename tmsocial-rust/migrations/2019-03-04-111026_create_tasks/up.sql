CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  time_limit FLOAT NOT NULL,
  memory_limit FLOAT NOT NULL,
  max_score FLOAT NOT NULL)
