# Internet Distribution System

This project is an internet distribution system that allows users to purchase various internet bundles lasting from one hour to 24 hours. It integrates with MikroTik hardware to manage internet access effectively.

## Project Structure

```
internet-distribution-system
├── src
│   ├── main.py                # Entry point of the application
│   ├── bundles
│   │   └── bundle_manager.py   # Manages internet bundles
│   ├── mikrotik
│   │   └── api_client.py       # Handles communication with MikroTik hardware
│   ├── users
│   │   └── user_manager.py      # Manages user accounts
│   └── utils
│       └── helpers.py          # Utility functions
├── requirements.txt            # Project dependencies
└── README.md                   # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd internet-distribution-system
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Configure the MikroTik API settings in `src/mikrotik/api_client.py`.

## Usage Guidelines

To start the application, run the following command:
```
python src/main.py
```

Users can then interact with the system to purchase internet bundles.

## Functionality Overview

- **Bundle Management**: Users can view available internet bundles, add new bundles, or remove existing ones.
- **User Management**: The system allows for user account creation, authentication, and retrieval of user details.
- **MikroTik Integration**: The application communicates with MikroTik hardware to manage internet distribution based on user purchases.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.