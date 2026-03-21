/*
  # Add Surfboard Number Column

  1. Changes
    - Add `surfboard_number` column to `rental_agreements` table
      - Type: text
      - Purpose: To identify which specific surfboard was assigned to the customer
      - Nullable: Can be empty initially but should be filled when board is assigned
  
  2. Important Notes
    - This field helps track which physical surfboard (by its number/ID) was rented
    - Useful for inventory management and damage tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_agreements' AND column_name = 'surfboard_number'
  ) THEN
    ALTER TABLE rental_agreements ADD COLUMN surfboard_number text;
  END IF;
END $$;