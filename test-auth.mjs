import fetch from "node-fetch";

const baseURL = "http://localhost:5000";

async function testAuthFlow() {
  console.log("🧪 Testing authentication flow...\n");
  
  // Step 1: Check initial auth state (should be null)
  console.log("Step 1: Check initial auth state");
  let response = await fetch(`${baseURL}/api/auth/user`, { credentials: "include" });
  let user = await response.json();
  console.log(`   Result: ${user ? "✅ Authenticated" : "❌ Not authenticated"}\n`);
  
  // Step 2: Login
  console.log("Step 2: Attempt login");
  response = await fetch(`${baseURL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test123", password: "Password123" }),
    credentials: "include"
  });
  const loginResult = await response.json();
  console.log(`   Response: ${response.ok ? "✅ Success" : "❌ Failed"}`);
  console.log(`   User: ${loginResult.user ? loginResult.user.username : "None"}\n`);
  
  // Step 3: Check auth state after login (should have user)
  console.log("Step 3: Check auth state after login");
  response = await fetch(`${baseURL}/api/auth/user`, { credentials: "include" });
  user = await response.json();
  console.log(`   Result: ${user ? `✅ Authenticated as ${user.username}` : "❌ Not authenticated"}\n`);
  
  if (user) {
    console.log("✅ Authentication flow works!");
  } else {
    console.log("❌ Session not persisting after login");
  }
}

testAuthFlow().catch(console.error);
