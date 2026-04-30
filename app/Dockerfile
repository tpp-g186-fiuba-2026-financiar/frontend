ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_SERVER_API
ENV VITE_SERVER_API=${VITE_SERVER_API}
RUN npm run build

FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --link --from=builder /app/dist ./dist
RUN --mount=type=cache,target=/root/.npm npm install serve@^14.2.6 --omit=dev
USER node
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]