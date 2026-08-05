import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) {
      throw new Error('No imageUrl provided in request body')
    }

    // 1. Fetch image from Supabase Storage public URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`)
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const uint8Array = new Uint8Array(imageArrayBuffer)

    // 2. Convert to chunk-safe base64 string
    let binary = ''
    const len = uint8Array.byteLength
    const chunkSize = 0x8000
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, len))
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    const base64Image = btoa(binary)
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // 3. Get Gemini API Key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    // 4. Call Gemini REST API directly with gemini-1.5-flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  text: `Extract the following details from this receipt image and return ONLY a valid JSON object with these exact keys:
                  - "merchant": string (Store or merchant name)
                  - "amount": number (Total amount paid)
                  - "date": string (Date in YYYY-MM-DD format, default to current date if missing)
                  - "category": string (Must be one of: Food, Rent, Utilities, Entertainment, Shopping, Bills, Other)
                  
                  Do not include any markdown formatting like \`\`\`json, just return the raw JSON string.`
                },
              ],
            },
          ],
        }),
      }
    )

    const geminiData = await geminiRes.json()
    
    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message || 'Gemini API failed to process image')
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const extractedData = JSON.parse(cleanedText)

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    console.error('Edge Function Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})