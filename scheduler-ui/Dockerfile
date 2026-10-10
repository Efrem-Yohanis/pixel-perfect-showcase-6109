FROM node:24-alpine

WORKDIR /app
COPY scheduler-ui/package.json scheduler-ui/package-lock.json* ./
RUN npm ci
COPY scheduler-ui/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
