-- GIN index for filtering on Product.values (sufficient to ~100k SKUs;
-- past that the migration path is a normalised ProductAttributeValue table).
CREATE INDEX "product_values_gin" ON "Product" USING GIN ("values" jsonb_path_ops);

-- Order numbers: FT-10001, FT-10002, … drawn from a Postgres sequence.
CREATE SEQUENCE "order_number_seq" START WITH 10001;
