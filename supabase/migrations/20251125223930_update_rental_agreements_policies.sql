/*
  # Update Rental Agreements Policies
  
  1. Changes
    - Allow anonymous users to view rental agreements (for admin dashboard testing)
    - This is for development/testing purposes
    
  2. Security Note
    - In production, you should add authentication and restrict view access
*/

DROP POLICY IF EXISTS "Authenticated users can view all agreements" ON rental_agreements;
DROP POLICY IF EXISTS "Authenticated users can update agreements" ON rental_agreements;

CREATE POLICY "Anyone can view rental agreements"
  ON rental_agreements
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update agreements"
  ON rental_agreements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);