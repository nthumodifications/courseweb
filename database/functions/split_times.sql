CREATE OR REPLACE FUNCTION split_times(times_arr text[])
RETURNS text[]
AS $$
DECLARE
    times_str text;
    times_result text[];
BEGIN
    -- Join the elements of the array into a single string
    times_str := array_to_string(times_arr, '');

    -- Split the string into an array with two characters in each element
    times_result := ARRAY(SELECT SUBSTRING(times_str, n, 2) FROM generate_series(1, LENGTH(times_str), 2) AS n);

    RETURN times_result;
END;
$$ LANGUAGE plpgsql;
