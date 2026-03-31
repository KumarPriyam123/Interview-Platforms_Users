import os
from dotenv import load_dotenv
load_dotenv()
import uvicorn
from app.main import app
if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
