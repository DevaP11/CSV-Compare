echo "Creating main.wasm from go file..."
GOOS=js GOARCH=wasm go build -o public/main.wasm

echo "Creating build file..."
npm run build

echo "Copying wasm_exec.js to dist..."
cp wasm_exec.js dist

echo "Deploying..."
firebase deploy
