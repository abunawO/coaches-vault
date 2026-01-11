# syntax=docker/dockerfile:1

ARG RUBY_VERSION=3.2.2
FROM ruby:${RUBY_VERSION}-slim AS base

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_WITHOUT="development test" \
    BUNDLE_PATH=/usr/local/bundle

WORKDIR /app

# ---- Build stage ----
FROM base AS build

# Packages needed to build gems + compile assets
RUN apt-get update -qq && apt-get install --no-install-recommends -y \
    build-essential \
    git \
    libpq-dev \
    pkg-config \
    curl \
    libvips \
    && rm -rf /var/lib/apt/lists/*

# Install gems first (better layer caching)
COPY Gemfile Gemfile.lock ./
RUN bundle install && rm -rf /root/.bundle /usr/local/bundle/cache

# Copy app code
COPY . .

# Precompile bootsnap (optional but nice)
RUN bundle exec bootsnap precompile --gemfile app/ lib/

# Precompile assets (no master key needed at build time)
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

# ---- Runtime stage ----
FROM base AS runtime

# Only runtime libraries (no compilers)
RUN apt-get update -qq && apt-get install --no-install-recommends -y \
    libpq5 \
    libvips \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

WORKDIR /app

# Copy gems + app from build stage
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app

# Rails serves on 3000 by default
EXPOSE 3000

# Ensure puma binds correctly
ENV RAILS_LOG_TO_STDOUT=1 \
    RAILS_SERVE_STATIC_FILES=1

CMD ["bash", "-lc", "bundle exec puma -C config/puma.rb"]
