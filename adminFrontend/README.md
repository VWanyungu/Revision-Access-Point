# Running the app

## Docker compose

```
docker run -p 8080:80 \
  --env-file .env \
  -e VITE_API_URL=https://api.example.com \
  my-react-app
```
