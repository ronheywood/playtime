# PlayTime

Because musicians need to lean and practice pieces, and they need structure to practice.

Notable studies into accelerated learning have helped define techniques that can be used in a session structure which will work well to help Musicians get the most out of their practice time. 

We believe that a multi platform App would be a good supporting tool to help organise this framework.

## Quick Start

### Using PSake Build System (Recommended)

```powershell
# Run all tests (Outside-In TDD approach)
.\build.ps1

# Start development environment (server + tests)
.\build.ps1 -Task Dev

# Run tests in watch mode for continuous feedback
.\build.ps1 -Task Watch

# See all available tasks
.\build.ps1 -Task Help
```

### Using npm directly

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run serve
```

### From Command Prompt

```cmd
# Run default task
build.cmd

# Run specific task
build.cmd Dev
```

## Development Workflow (Outside-In TDD)

1. **Start with failing tests**: Run `.\build.ps1 -Task Dev` to see current failing acceptance tests
2. **Implement minimal code**: Write just enough code to make one test pass
3. **Refactor**: Clean up code while keeping tests green
4. **Repeat**: Move to the next failing test

The acceptance tests define the complete feature requirements and will guide your implementation.

## How to use PlayTime

1. Add a pdf score, tab or lead sheet of the piece you would like to practice.
2. Highlight sections of the piece identifying `green` for sections you are confident with, `amber` for sections you are unsure about, and `red` for sections that you need to study.
3. Arrange these sections into a practice plan. Identify deliberate practice strategies to tackle these sections and start you practice

## Deliberate practice strategies
*   **Chunking:** Break down the piece into smaller, manageable sections. Master each section before combining them
*   **Slow Practice:** Play the piece at a significantly slower tempo to ensure accuracy and identify tricky passages.
*   **Repetition with Variation:** Repeat challenging sections, but vary the rhythm, articulation, or dynamics to solidify learning.
*   **Metronome Work:** Use a metronome to develop a consistent sense of timing and rhythm. Gradually increase the tempo as you improve.
*   **Recording and Self-Correction:** Record yourself playing and listen back critically to identify areas for improvement.
*   **Targeted Problem Solving:** Isolate specific technical difficulties or musical challenges and work on them systematically.
*   **Interleaving:** Mix practice of different sections or pieces to improve retention and adaptability.

## Build Tasks

The PSake build system provides several tasks to support Outside-In development:

- **Default/Test**: Run all tests
- **Clean**: Clean build artifacts and stop servers  
- **Install**: Install npm dependencies
- **Dev**: Start development environment (server + tests)
- **Watch**: Run tests in continuous watch mode
- **StartServer**: Start development server only
- **StopServer**: Stop development server
- **AcceptanceTest**: Run acceptance tests only
- **CI**: Full CI pipeline for build servers

## Project Structure

```
├── index.html              # Main application entry point
├── styles/main.css         # Application styles
├── scripts/                # JavaScript modules (to be implemented)
│   ├── db.js              # IndexedDB wrapper
│   ├── pdf-viewer.js      # PDF.js integration
│   ├── highlighting.js    # Section marking functionality
│   └── main.js            # Application entry point
├── tests/
│   ├── setup.js           # Test environment configuration
│   ├── acceptance/        # Outside-In acceptance tests
│   └── fixtures/          # Test PDF files
├── psakefile.ps1          # PSake build definitions
├── build.ps1              # PowerShell build wrapper
└── build.cmd              # Command prompt build wrapper
```
