import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.400.0'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.400.0'

const ALLOWED_ORIGINS = ['https://www.aps-construction.com', 'https://aps-construction.com'];

const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// DEPRECATED: use getCorsHeaders(req) instead
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Verify caller's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(token)

    if (verifyError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // R2 credentials from server-side env variables (NEVER exposed to client)
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID') ?? ''
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') ?? 'aps-task-files'
    const R2_PUBLIC_DOMAIN = Deno.env.get('R2_PUBLIC_DOMAIN') ?? ''

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Configuration R2 manquante côté serveur')
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    const { action, path, contentType, fileSize } = await req.json()

    // Generate a presigned URL for upload
    if (action === 'getUploadUrl') {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        ContentType: contentType || 'application/octet-stream',
      })

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      const publicUrl = R2_PUBLIC_DOMAIN
        ? `${R2_PUBLIC_DOMAIN}/${path}`
        : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${path}`

      return new Response(
        JSON.stringify({ uploadUrl, publicUrl }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Initialize multipart upload
    if (action === 'initMultipartUpload') {
      const command = new CreateMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        ContentType: contentType || 'application/octet-stream',
      })

      const result = await s3Client.send(command)

      return new Response(
        JSON.stringify({ uploadId: result.UploadId }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get presigned URL for a specific part
    if (action === 'getPartUploadUrl') {
      const { uploadId, partNumber } = await req.json()

      const command = new UploadPartCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        UploadId: uploadId,
        PartNumber: partNumber,
      })

      const partUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

      return new Response(
        JSON.stringify({ partUrl }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Complete multipart upload
    if (action === 'completeMultipartUpload') {
      const { uploadId, parts } = await req.json()

      await s3Client.send(new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }))

      const publicUrl = R2_PUBLIC_DOMAIN
        ? `${R2_PUBLIC_DOMAIN}/${path}`
        : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${path}`

      return new Response(
        JSON.stringify({ publicUrl }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
