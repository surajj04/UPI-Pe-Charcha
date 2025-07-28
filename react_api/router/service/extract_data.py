import pdfplumber
import re
import pandas as pd
from datetime import datetime
import io


def extract_text(file):
    full_text = ""
    with pdfplumber.open(io.BytesIO(file)) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
    return full_text


def extract_data(file):
    raw_text = extract_text(file)

    cleaned_text = re.sub(r"Page \d+ of \d+", "", raw_text)
    cleaned_text = re.sub(
        r"This (is|an).*?statement\.", "", cleaned_text, flags=re.DOTALL
    )
    cleaned_text = re.sub(r"https://[^\s]+", "", cleaned_text)

    pattern = re.compile(
        r"(?P<date>\w{3,9} \d{1,2}, \d{4})\s+"
        r"(?P<desc>.*?)\s+"
        r"(?P<type>Credit|Debit)\s+INR (?P<amount>[\d.]+)\s+"
        r"(?P<time>\d{2}:\d{2} [AP]M)",
        re.DOTALL,
    )

    matches = pattern.finditer(cleaned_text)

    transactions = []
    for match in matches:
        date_str = match.group("date").strip()
        time_str = match.group("time").strip()
        desc = match.group("desc").strip().replace("\n", " ")
        type_ = match.group("type").strip()
        amount = float(match.group("amount"))
        date_fmt = datetime.strptime(date_str, "%b %d, %Y").strftime("%Y-%m-%d")

        transactions.append(
            {
                "date": date_fmt,
                "description": desc,
                "type": type_,
                "amount": amount,
            }
        )

    df = pd.DataFrame(transactions)

    return df


def clean(df):
    df["type"] = df["type"].str.lower()

    def map_category(desc):
        desc = desc.lower()
        if "salary" in desc or "received from" in desc:
            return ("Income", "Personal")
        elif "zepto" in desc or "blinkit" in desc or "vegetable" in desc:
            return ("Grocery Store", "Food")
        elif "chemist" in desc or "medical" in desc or "health" in desc:
            return ("Pharmacy", "Medical")
        elif "recharge" in desc:
            return ("Mobile Recharge", "Utilities")
        elif "delhivery" in desc:
            return ("Courier Service", "Logistics")
        elif "aqua" in desc:
            return ("Water Supply", "Utilities")
        elif "store" in desc or "traders" in desc:
            return ("General Store", "Groceries")
        elif "paid to" in desc:
            return ("Online Transfer", "Transfer")
        else:
            return ("Other", "Uncategorized")

    df[["mapped_description", "category"]] = df["description"].apply(
        lambda x: pd.Series(map_category(x))
    )

    return df


def df_to_json(df):
    return df.to_dict(orient="records")
