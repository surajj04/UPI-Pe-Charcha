from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from .service import extract_data

router = APIRouter(prefix="/analysis")


@router.post("/upload")
async def analyze_data(file: UploadFile = File(...)):
    contents = await file.read()

    # Step 1: Extract transactions from PDF
    df = extract_data.extract_data(file=contents)

    # Step 2: Clean and transform if needed
    cleaned_df = extract_data.clean(df)

    # Step 3: Convert cleaned DataFrame to JSON (records format)
    json_data = extract_data.df_to_json(cleaned_df)
    # Step 4: Return response
    return JSONResponse(
        content={
            "data": json_data,
            "filename": file.filename,
            "content_type": file.content_type,
        }
    )
