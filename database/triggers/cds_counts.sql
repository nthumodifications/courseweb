-- Create a table to store course code counts
create table if not exists
  public.cds_counts (
    code text not null,
    count bigint not null default 0,
    constraint cds_counts_pkey primary key (code),
    constraint cds_counts_code_fkey foreign key (code) references courses (raw_id)
  ) tablespace pg_default;

CREATE OR REPLACE FUNCTION update_cds_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement count for each code in the OLD array (for UPDATE and DELETE)
  UPDATE cds_counts
  SET count = count - 1
  WHERE code = ANY(OLD.selections) AND count > 0;

  -- If a code count drops to 0, delete the row
  DELETE FROM cds_counts
  WHERE code = ANY(OLD.selections) AND count <= 0;

  -- Increment count for each code in the NEW array (for INSERT and UPDATE)
  UPDATE cds_counts
  SET count = count + 1
  WHERE code = ANY(NEW.selections);

  -- If a code is not present in cds_counts, insert with count 1
  INSERT INTO cds_counts (code, count)
  SELECT unnest(NEW.selections), 1
  ON CONFLICT (code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cds_submissions_trigger
AFTER INSERT OR UPDATE OR DELETE
ON cds_submissions
FOR EACH ROW
EXECUTE FUNCTION update_cds_count();

INSERT INTO cds_counts (code, count)
SELECT unnest(selections), COUNT(*)
FROM cds_submissions
GROUP BY unnest(selections)
ON CONFLICT (code) DO NOTHING;

