interface CloudflareEnv {
  DB: D1Database
}

declare module '@opennextjs/cloudflare' {
  export function getCloudflareContext(): Promise<{
    env: CloudflareEnv
    ctx: ExecutionContext
    cf: CfProperties
  }>
}
