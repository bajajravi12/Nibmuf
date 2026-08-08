# Pulse Messenger - Cloudflare Deployment Guide

Pulse Messenger is engineered for direct edge deployment on **Cloudflare Pages**, **Cloudflare Workers**, **Cloudflare D1**, **Cloudflare Durable Objects**, and **Cloudflare R2**.

## 1. Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account with D1 and Durable Objects enabled

```bash
npm install -g wrangler
wrangler login
```

## 2. Cloudflare D1 Database Provisioning

Create a new Cloudflare D1 database:

```bash
wrangler d1 create pulse-db
```

Copy the generated `database_id` into `wrangler.jsonc`.

Apply database migrations:

```bash
wrangler d1 execute pulse-db --file=./migrations/0000_schema.sql
```

## 3. Cloudflare R2 Storage Bucket Creation

Create the media storage bucket:

```bash
wrangler r2 bucket create pulse-media-bucket
```

## 4. Cloudflare KV Namespace

Create KV namespace for fast presence cache:

```bash
wrangler kv namespace create pulse-kv
```

Copy the ID into `wrangler.jsonc`.

## 5. Deploy to Cloudflare Workers & Pages

Build frontend assets and deploy the worker backend:

```bash
npm run build
wrangler deploy
```

Your Pulse Messenger platform will be live globally on Cloudflare Edge!
