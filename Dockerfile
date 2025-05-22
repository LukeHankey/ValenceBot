# Stage 1: Base build with dependencies
FROM node:22.14.0 AS base

WORKDIR /project

# Copy only package files first (helps caching)
COPY package*.json ./

# Install dependencies (cached if package.json doesn't change)
RUN npm install --omit=dev

# Now copy the rest of the code (this may invalidate cache, but it's after install)
COPY . .

# Stage 2: Production container
FROM node:22.14.0 AS production

WORKDIR /project

# Copy built app and installed modules from base
COPY --from=base /project /project

# Create a non-root user
RUN useradd -ms /bin/bash prod && chown -R prod:prod /project
USER prod

# Start the app
ENTRYPOINT ["npm"]
CMD ["run", "start"]
