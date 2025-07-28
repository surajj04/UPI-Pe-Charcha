from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from router import analysis, home

app = FastAPI()

app.include_router(analysis.router)
app.include_router(home.router)


# Allow frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
