import { List, ActionPanel, Action, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useUser } from "./hooks";
import { Preferences } from "./lib/types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [queryText, setQueryText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const debugMode = preferences.debugMode || false;

  const { user, isLoading, error, isAuthenticated, isAuthenticating, authenticate } = useUser(queryText, {
    execute: queryText.length > 0,
  });

  // Log errors in debug mode
  if (debugMode && error) {
    console.error("API Error:", error);
  }

  function handleSearch(text: string) {
    setSearchText(text);
    if (text.endsWith("\n")) {
      performSearch();
    }
  }

  async function performSearch() {
    if (!searchText.trim()) return;

    if (!isAuthenticated && !isAuthenticating) {
      await authenticate();
    }

    setQueryText(searchText.trim());
  }

  function getErrorDetails() {
    if (!error) return null;

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("Unauthorized")) {
      return {
        title: "Authentication Error",
        description: "Your access token may be invalid or expired. Please re-authenticate.",
        actions: (
          <ActionPanel>
            <Action title="Re-authenticate" onAction={authenticate} icon={Icon.Lock} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        ),
      };
    }

    return {
      title: "User Not Found",
      description: "No user was found with that login. Please check the username and try again.",
      actions: (
        <ActionPanel>
          <Action title="Try Search Again" onAction={performSearch} icon={Icon.RotateClockwise} />
        </ActionPanel>
      ),
    };
  }

  return (
    <List
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Enter 42 login (e.g., jdoe) and press Enter"
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <ActionPanel>
          <Action
            title="Search"
            onAction={performSearch}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action.OpenInBrowser
            url="https://meta.intra.42.fr/clusters"
            title="Open Cluster Map"
            shortcut={{ modifiers: ["shift"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      {isAuthenticating ? (
        <List.EmptyView
          title="Authenticating..."
          description="Please complete the OAuth flow to continue"
          icon={Icon.Lock}
        />
      ) : !isAuthenticated ? (
        <List.EmptyView
          title="Authentication Required"
          description="Please complete the OAuth flow to use this extension"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action title="Authenticate" onAction={authenticate} icon={Icon.Lock} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          title={getErrorDetails()?.title || "Error"}
          description={getErrorDetails()?.description || "An unknown error occurred"}
          icon={Icon.ExclamationMark}
          actions={getErrorDetails()?.actions}
        />
      ) : !queryText ? (
        <List.EmptyView
          title="Enter a 42 login to search"
          description="Type a 42 username in the search field above and press Enter"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                onAction={performSearch}
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action.OpenInBrowser
                url="https://meta.intra.42.fr/clusters"
                title="Open Cluster Map"
                shortcut={{ modifiers: ["shift"], key: "return" }}
              />
            </ActionPanel>
          }
        />
      ) : !user ? (
        <List.EmptyView title="Loading..." description="Fetching user information" icon={Icon.Clock} />
      ) : (
        <List.Section title="User Information">
          <List.Item
            title={user.login}
            subtitle="Username"
            icon={{ source: user.image.link }}
            accessories={[{ text: "View Profile", icon: Icon.Link }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://profile.intra.42.fr/users/${user.login}`} title="Open Profile" />
                <Action.OpenInBrowser
                  url="https://meta.intra.42.fr/clusters"
                  title="Open Cluster Map"
                  shortcut={{ modifiers: ["shift"], key: "return" }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={user.location ? user.location : "Not currently logged in"}
            subtitle="Location"
            icon={user.location ? Icon.Pin : Icon.Logout}
          />
        </List.Section>
      )}
    </List>
  );
}
