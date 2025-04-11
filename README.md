# Linear MCP Server

> **About this Fork**: This repository is a fork of [@ibraheem4/linear-mcp](https://github.com/ibraheem4/linear-mcp), extended based on practical work experience. It adds enhanced functionality, particularly for label management and parent-child issue relationships, enabling more flexible and detailed operations.

> Note: This is a custom implementation. For the official Cline Linear MCP server, see [cline/linear-mcp](https://github.com/cline/linear-mcp).

<a href="https://glama.ai/mcp/servers/71fqw0uqmx"> <img width="380" height="200" src="https://glama.ai/mcp/servers/71fqw0uqmx/badge" />

A Model Context Protocol (MCP) server that provides tools for interacting with Linear's API, enabling AI agents to manage issues, projects, and teams programmatically through the Linear platform.

## Available Tools

This MCP provides the following tools for leveraging Linear's functionality. Features shown in **bold** are additions or extensions to the original repository.

### **Enhanced Features**

#### **Label Management**

##### **list_labels**

Retrieves a list of labels associated with a team.

```typescript
{
  teamId: string; // Required: Team ID
}
```

##### **create_label**

Creates a new label.

```typescript
{
  teamId: string;      // Required: Team ID
  name: string;        // Required: Label name
  color: string;       // Required: Label color (hex color code)
  description?: string; // Optional: Label description
}
```

##### **update_label**

Updates an existing label.

```typescript
{
  id: string;          // Required: Label ID
  name?: string;       // Optional: New label name
  color?: string;      // Optional: New color (hex color code)
  description?: string; // Optional: New description
}
```

##### **list_states**

Displays a list of workflow states for a specific team.

```typescript
{
  teamId: string; // Required: Team ID
}
```

#### **Parent-Child Issue Management**

##### **create_issue** (Enhanced)

```typescript
{
  title: string;          // Required: Issue title
  description?: string;   // Optional: Issue description (markdown supported)
  teamId: string;        // Required: Team ID
  assigneeId?: string;   // Optional: Assignee user ID
  priority?: number;     // Optional: Priority (0-4)
  labels?: string[];     // Optional: Label IDs to apply
  parentId?: string;     // **Added**: Parent issue ID
}
```

##### **update_issue** (Enhanced)

```typescript
{
  issueId: string;       // Required: Issue ID
  title?: string;        // Optional: New title
  description?: string;  // Optional: New description
  status?: string;      // Optional: New status
  assigneeId?: string;  // Optional: New assignee ID
  priority?: number;    // Optional: New priority (0-4)
  labels?: string[];   // Optional: Label IDs to apply to the issue
  parentId?: string;   // **Added**: Parent issue ID
  projectId?: string;  // **Added**: Project ID
}
```

### Basic Features

#### list_issues

Lists issues with optional filters.

```typescript
{
  teamId?: string;      // Optional: Filter by team ID
  assigneeId?: string;  // Optional: Filter by assignee ID
  status?: string;      // Optional: Filter by status
  first?: number;       // Optional: Number of issues to return (default: 50)
}
```

#### list_teams

Lists all teams in the workspace. No parameters required.

#### list_projects

Lists projects with optional filters.

```typescript
{
  teamId?: string;     // Optional: Filter by team ID
  first?: number;      // Optional: Number of projects to return (default: 50)
}
```

#### search_issues

Searches for issues using a text query.

```typescript
{
  query: string;       // Required: Search query text
  first?: number;      // Optional: Number of results to return (default: 50)
}
```

#### get_issue

Gets detailed information about a specific issue.

```typescript
{
  issueId: string; // Required: Issue ID
}
```

#### get_project

Gets detailed information about a specific project, including teams, issues, and members.

```typescript
{
  projectId: string; // Required: Project ID
}
```

## Prerequisites

- Node.js (v16 or higher)
- Linear account with API access
- Linear API key with appropriate permissions

## Quick Start

1. Get your Linear API key from [Linear's Developer Settings](https://linear.app/settings/api)

2. Clone the repository and build it locally:

```bash
git clone https://github.com/texmeijin/linear-enhanced-mcp.git
cd linear-enhanced-mcp
npm install
npm run build
```

3. Run with your API key:

```bash
export LINEAR_API_KEY=your-api-key-here
node build/index.js
```

Note: NPX installation is planned for future releases.

## Development Setup

1. Clone the repository:

```bash
git clone [repository-url]
cd linear-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Running with Inspector

For local development and debugging, you can use the MCP Inspector:

1. Install the MCP Inspector:

```bash
npm install -g @modelcontextprotocol/inspector
```

2. Run the server with the inspector:

```bash
LINEAR_API_KEY=your-api-key-here npx @modelcontextprotocol/inspector node build/index.js
```

3. Access the Inspector

## Configuration

Configure the MCP server in your settings file based on your client:

### For Claude Desktop

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linear-enhanced-mcp": {
      "command": "node",
      "args": ["/path/to/linear-enhanced-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For VS Code Extension (Cline)

Location: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "linear-enhanced-mcp": {
      "command": "node",
      "args": ["/path/to/linear-enhanced-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For Cursor ([cursor.sh](https://cursor.sh))

For Cursor, the server must be run with the full path:

```bash
node /path/to/linear-enhanced-mcp/build/index.js
```

## Development

For development with auto-rebuild:

```bash
npm run watch
```

## Error Handling

The server includes comprehensive error handling for:

- Invalid API keys
- Missing required parameters
- Linear API errors
- Invalid tool requests

All errors are properly formatted and returned with descriptive messages.

## Technical Details

Built with:

- TypeScript
- Linear SDK (@linear/sdk v37.0.0)
- MCP SDK (@modelcontextprotocol/sdk v0.6.0)

The server uses stdio for communication and implements the Model Context Protocol for seamless integration with AI agents.

## License

MIT
