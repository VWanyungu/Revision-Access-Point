import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://ptktlornnngqvzbbisaq.supabase.co'
const supabaseKey =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0a3Rsb3Jubm5ncXZ6YmJpc2FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTE4NDY3MSwiZXhwIjoyMDMwNzYwNjcxfQ.cAoTKuNfAfaDUtEnFk8TfWPVO3GBoDEIoZ1N-U40mfk'
export const supabase = createClient(supabaseUrl, supabaseKey)