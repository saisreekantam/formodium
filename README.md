# formodium
# AI Gift Recommendation System

## Youtube link

https://youtu.be/U-BtEe3M6vM?si=0Gr-bVZbgX-0BsA-


A full-stack web application that provides personalized gift recommendations using AI/ML algorithms. The system uses a comprehensive survey to understand user preferences and provides tailored gift suggestions across multiple categories.

## Features

- Interactive survey with 20+ questions across different categories
- Real-time gift recommendations using ML-based matching
- Category-based gift browsing and filtering
- Responsive design with modern UI components
- Secure user authentication system
- Shipping and order management
- Integrated chatbot for gift advice

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router for navigation
- Lucide React for icons
- Recharts for data visualization

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- ML libraries (scikit-learn, numpy)
- LangChain for chatbot functionality
- SQLite database

## Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- pip

### Installation

1. Clone the repository:
```bash
git clone https://github.com/saisreekantam/formodium.git
cd gift-recommendation-system
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn app:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `POST /survey` - Submit survey responses and get recommendations
- `POST /shipping` - Process shipping details
- `GET /gifts` - Get all available gifts
- `POST /chatbot` - Interact with the gift recommendation chatbot

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

