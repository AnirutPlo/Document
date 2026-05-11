# Queue FIFO

## Overview

### To-Be
```mermaid
stateDiagram-v2
    [*] --> ToPrepare
    [*] --> WaitingToCall
    ToPrepare --> WaitingToCall
    WaitingToCall --> Called
    Called --> Hold
    Hold --> Called
    Called --> Completed
    WaitingToCall --> Cancelled
    Hold --> Cancelled
    Called --> Cancelled
    Completed --> [*]
```