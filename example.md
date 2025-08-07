# Example Mermaid Diagrams

This file contains several Mermaid diagrams that can be visualized using the Mermaid to React Flow converter.

## Simple Flowchart

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
```

## Process Flow with Styling

```mermaid
flowchart LR
    A[Input Data] --> B[Process Data]
    B --> C{Valid?}
    C -->|Yes| D[Store in Database]
    C -->|No| E[Log Error]
    E --> F[Send Alert]
    D --> G[Generate Report]
    F --> G
    G --> H[Output Result]
```

## Complex System Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[User Interface]
        RT[React Components]
        RX[Redux Store]
    end
    
    subgraph Backend
        API[REST API]
        AUTH[Auth Service]
        DB[(Database)]
    end
    
    subgraph External
        CACHE[Redis Cache]
        QUEUE[Message Queue]
    end
    
    UI --> RT
    RT --> RX
    RX --> API
    API --> AUTH
    API --> DB
    API --> CACHE
    AUTH --> DB
    API --> QUEUE
```

## Decision Tree

```mermaid
graph TD
    START[Start Analysis] --> Q1{Data Available?}
    Q1 -->|Yes| Q2{Data Quality OK?}
    Q1 -->|No| END1[Request Data]
    Q2 -->|Yes| PROCESS[Process Data]
    Q2 -->|No| CLEAN[Clean Data]
    CLEAN --> PROCESS
    PROCESS --> Q3{Results Valid?}
    Q3 -->|Yes| REPORT[Generate Report]
    Q3 -->|No| REVIEW[Manual Review]
    REVIEW --> ADJUST[Adjust Parameters]
    ADJUST --> PROCESS
    REPORT --> END2[Complete]
```

## Workflow with Multiple Paths

```mermaid
flowchart TD
    A[User Request] --> B{Request Type}
    B -->|Create| C[Validate Input]
    B -->|Update| D[Check Permissions]
    B -->|Delete| E[Confirm Action]
    B -->|Read| F[Fetch Data]
    
    C --> G[Save to DB]
    D --> H{Has Permission?}
    H -->|Yes| I[Update Record]
    H -->|No| J[Access Denied]
    E --> K{Confirmed?}
    K -->|Yes| L[Delete Record]
    K -->|No| M[Cancel]
    F --> N[Return Data]
    
    G --> O[Success Response]
    I --> O
    L --> O
    N --> O
    J --> P[Error Response]
    M --> P
```