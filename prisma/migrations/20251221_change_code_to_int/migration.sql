-- AlterTable Movie and Serial code column from String to Integer
-- First, update any non-numeric codes to a safe default or handle them
-- This assumes you want to convert existing string codes to integers

-- For Movie table
ALTER TABLE "Movie" ALTER COLUMN "code" TYPE INTEGER USING (
  CASE 
    WHEN "code" ~ '^\d+$' THEN "code"::INTEGER
    ELSE abs(hashtext("code"))
  END
);

-- For Serial table  
ALTER TABLE "Serial" ALTER COLUMN "code" TYPE INTEGER USING (
  CASE 
    WHEN "code" ~ '^\d+$' THEN "code"::INTEGER
    ELSE abs(hashtext("code"))
  END
);
