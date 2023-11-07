create or replace view distinct_venues as
SELECT DISTINCT unnest(venues) AS venue from courses