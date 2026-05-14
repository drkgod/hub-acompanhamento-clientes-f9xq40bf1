routerAdd(
  'GET',
  '/backend/v1/tldv-info',
  (e) => {
    const secret = $secrets.get('TLDV_WEBHOOK_SECRET') || ''
    const instanceUrl = $secrets.get('PB_INSTANCE_URL') || ''

    return e.json(200, {
      secret,
      instanceUrl,
    })
  },
  $apis.requireAuth(),
)
