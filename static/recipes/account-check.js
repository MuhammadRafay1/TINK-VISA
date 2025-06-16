async function tinkBalanceWorkflowDefinition(workflowCtx, portal) {
  return {
    "Intro": {
      name: "Overview",
      stepCallback: async () => {
        console.log("Step: Intro");
        return workflowCtx.showContent(`
## 🔍 Tink Balance Check (US) – API Walkthrough

This guide walks you through integrating Tink's Balance Check functionality via direct API calls (without SDK), covering:

1. Getting a **client access token**
2. Creating a **user**
3. Generating a **user access token**
4. Fetching the **Account Check report**

Make sure your credentials (client ID and secret) are ready before starting.
        `);
      }
    },

    "Step 1": {
      name: "Get Client Access Token",
      stepCallback: async () => {
        console.log("Step 1: Get Client Access Token");

        return workflowCtx.showEndpoint({
          endpointPermalink: "$e/General.OAuth/token",
          description: `Obtain a client access token using your Tink client credentials.`,
          args: {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
              grant_type: "client_credentials",
              client_id: "YOUR_CLIENT_ID",
              client_secret: "YOUR_CLIENT_SECRET",
              scope: "user:create,authorization:grant,link-session:write,user:read,credentials:read"
            
          },
          verify: (response, setError) => {
            if (response.StatusCode !== 200) {
              setError("Access token not received. Please check client credentials.");
              return false;
            }
            return true;
          }
        });
      }
    },

    "Step 2": {
      name: "Create User",
      stepCallback: async (stepState) => {
        const step1State = stepState?.["Step 1"];
        console.log("Step 2: Create User", step1State);
        const accessToken = step1State?.data?.access_token;
        
        if (!accessToken) {
          return workflowCtx.showContent("❌ Missing access token from Step 1");
        }

        return workflowCtx.showEndpoint({
          endpointPermalink: "$e/General.User/createUser",
          description: `Create a new user under your Tink client.`,
          args: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: {
              "external_user_id": null,
              "market": "US",
              "locale": "en_US"
            }
          },
          verify: (response, setError) => {
            console.log("Step 2 response:", response);
            if (response.StatusCode !== 200) {
              setError("User ID not found in response. Check your access token.");
              return false;
            }
            return true;
          }
        });
      }
    },

    "Step 3": {
      name: "Get User Access Token",
      stepCallback: async (stepState) => {
        console.log("Step 3: Get User Access Token", stepState);
        const clientAccessToken = stepState?.["Step 1"]?.data?.access_token;
        const userId = stepState?.["Step 2"]?.data?.user_id;

        if (!clientAccessToken || !userId) {
          return workflowCtx.showContent("❌ Missing required values from previous steps.");
        }

        return workflowCtx.showEndpoint({
          endpointPermalink: "$e/General.OAuth/authorizationDelegate",
          description: `Generate a user access token to access personal financial data.`,
          args: {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Bearer ${clientAccessToken}`
            },
      
              grant_type: "user_credentials",
              id_hint: userId,
              scope: "user:create,authorization:grant,link-session:write,user:read,credentials:read",
              user_id: userId
          },
          verify: (response, setError) => {
            console.log("Step 3 response:", response);
            if (response.StatusCode !== 200) {
              setError("User access token not received. Verify user ID and client token.");
              return false;
            }
            return true;
          }
        });
      }
    },

    "Step 4": {
      name: "Fetch Account Check Report",
      stepCallback: async (stepState) => {
        console.log("Step 4: Fetch Account Check Report", stepState);
        const userAccessToken = stepState?.["Step 1"]?.data?.access_token;
        const code = stepState?.["Step 3"]?.data?.code;
        if (!userAccessToken) {
          return workflowCtx.showContent("❌ Missing user access token from Step 3.");
        }

        return workflowCtx.showEndpoint({
          endpointPermalink: "$e/Data%20v1.Account%20Verification/getReport",
          description: `Retrieve the Account Check report for the user.`,
          args: {
            headers: {
              Authorization: `Bearer ${userAccessToken}`
            },
            id : code
          },
          verify: (response, setError) => {
            console.log("Step 4 response:", response);
            if (response.StatusCode !== 200) {
              setError("No account report found in response.");
              return false;
            }
            return true;
          }
        });
      }
    },
  };
}
