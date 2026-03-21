/*
  # Agua Tibia Surf School - Rental Agreements System

  1. New Tables
    - `rental_agreements`
      - `id` (uuid, primary key) - Unique identifier for each agreement
      - `name` (text) - Customer's full name
      - `email` (text) - Customer's email address
      - `phone` (text) - Customer's phone number
      - `address` (text) - Customer's address in Guiones
      - `pickup` (text) - Pickup time/date
      - `return_time` (text) - Return time/date
      - `board_checked_by` (text) - Staff member who checked the board
      - `rental_type` (text) - Type of rental: surfboard, regular, premium, bodyboard
      - `rental_duration` (text) - Duration: sesh, full_day, week
      - `rental_price` (decimal) - Price of the rental
      - `payment_method` (text) - Payment method: cash or card
      - `signature_data` (text) - Digital signature as base64
      - `agreed_to_terms` (boolean) - Customer agreed to terms
      - `created_at` (timestamptz) - When the agreement was created
      - `status` (text) - Status: pending, active, completed, cancelled
      
  2. Security
    - Enable RLS on `rental_agreements` table
    - Add policy for public insert (customers can submit forms)
    - Add policy for authenticated users to view all agreements (admin access)

  3. Important Notes
    - This table stores all surfboard rental agreements
    - Signature is stored as base64 encoded data
    - All prices are stored in USD
    - Status tracking allows for rental management
*/

CREATE TABLE IF NOT EXISTS rental_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text,
  pickup text,
  return_time text,
  board_checked_by text,
  rental_type text NOT NULL,
  rental_duration text NOT NULL,
  rental_price decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  signature_data text,
  agreed_to_terms boolean DEFAULT false,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rental_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit rental agreements"
  ON rental_agreements
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all agreements"
  ON rental_agreements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update agreements"
  ON rental_agreements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);