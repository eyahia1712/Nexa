"""Build data/curated/org-maybank.json: the demo workforce for the organisation view.

Illustrative demo data only. The organisation is shown as "Maybank, Kuala Lumpur"
for the hackathon demo, but every person, name, career and skill here is invented.
None of it comes from Maybank. Run: python3 -I scripts/build_org_demo.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOW = 2026

# Typical skills for each job (Nexa skill ids, 1 basic, 2 working, 3 strong).
SKILLS = {
    "11-1011.00": {"leadership": 3, "people_mgmt": 2, "financial_analysis": 2, "communication": 3, "problem_solving": 3, "project_mgmt": 2},
    "11-1021.00": {"leadership": 3, "project_mgmt": 3, "process_improvement": 3, "communication": 2, "financial_analysis": 2, "people_mgmt": 2},
    "11-3031.00": {"financial_analysis": 3, "accounting": 3, "leadership": 2, "spreadsheets": 3, "data_analysis": 2, "communication": 2},
    "11-3021.00": {"software_dev": 2, "cloud": 2, "cybersecurity": 2, "leadership": 3, "project_mgmt": 2, "networking": 2, "genai": 2},
    "11-3121.00": {"people_mgmt": 3, "leadership": 3, "communication": 3, "empathy": 2, "teaching": 2, "counselling": 2},
    "11-2021.00": {"digital_marketing": 3, "leadership": 2, "data_analysis": 2, "creative_thinking": 2, "communication": 3},
    "43-1011.00": {"leadership": 2, "customer_care": 3, "communication": 3, "people_mgmt": 2, "crm": 2, "process_improvement": 1, "empathy": 2},
    "43-4051.00": {"customer_care": 3, "communication": 3, "empathy": 3, "crm": 2, "product_knowledge": 3, "multilingual": 3, "data_entry": 2, "problem_solving": 2},
    "43-9021.00": {"data_entry": 3, "spreadsheets": 2, "admin": 2, "accounting": 1},
    "43-3071.00": {"customer_care": 2, "product_knowledge": 3, "sales": 2, "communication": 2, "multilingual": 2},
    "43-6014.00": {"admin": 3, "data_entry": 2, "spreadsheets": 2, "communication": 2, "project_mgmt": 1, "teamwork": 3},
    "43-4171.00": {"customer_care": 2, "communication": 3, "admin": 2, "multilingual": 2},
    "13-2011.00": {"accounting": 3, "financial_analysis": 2, "spreadsheets": 3, "data_analysis": 2, "sustainability_esg": 1},
    "43-3031.00": {"accounting": 3, "data_entry": 3, "spreadsheets": 2, "admin": 1},
    "13-2051.00": {"financial_analysis": 3, "data_analysis": 3, "spreadsheets": 3, "fintech": 2, "sql": 1, "analytical_thinking": 2},
    "15-1252.00": {"software_dev": 3, "python": 3, "web_dev": 2, "cloud": 2, "genai": 2, "sql": 2},
    "15-1232.00": {"it_support": 3, "networking": 2, "customer_care": 2, "cybersecurity": 1, "problem_solving": 2},
    "15-1212.00": {"cybersecurity": 3, "networking": 3, "cloud": 2, "ai_ethics": 1, "problem_solving": 2},
    "15-2051.01": {"data_analysis": 3, "sql": 3, "data_viz": 3, "spreadsheets": 3, "python": 2, "statistics": 2},
    "13-1161.00": {"digital_marketing": 2, "creative_thinking": 2, "data_analysis": 1, "genai": 2, "communication": 2, "sustainability_esg": 1},
    "27-1024.00": {"creative_thinking": 3, "ux_design": 1, "web_dev": 1, "genai": 1, "communication": 1},
    "13-1071.00": {"people_mgmt": 2, "communication": 3, "empathy": 2, "teaching": 2, "admin": 2, "data_analysis": 1},
    "13-1151.00": {"teaching": 3, "communication": 3, "people_mgmt": 2, "genai": 1, "lifelong_learning": 3},
}

# id, name, gender, age band, dept, manager, entry, consent, history [(year, title, soc)]
PEOPLE = [
    ("m01", "Azlan Hashim", "M", "50+", "Leadership", None, "experienced", True, [(2008, "Finance Manager", "11-3031.00"), (2015, "Chief Operating Officer", "11-1021.00"), (2020, "Chief Executive Officer", "11-1011.00")]),
    ("m02", "Lee Mei Fong", "F", "40-49", "Leadership", "m01", "experienced", True, [(2012, "Branch Operations Manager", "11-1021.00"), (2021, "Chief Operating Officer", "11-1021.00")]),
    ("m03", "Nurul Huda Kamal", "F", "30-39", "Customer Service", "m02", "fresh", True, [(2014, "Customer Service Executive", "43-4051.00"), (2018, "Senior Customer Service Executive", "43-4051.00"), (2022, "Customer Service Supervisor", "43-1011.00")]),
    ("m04", "Siti Aisyah Rahim", "F", "30-39", "Customer Service", "m03", "fresh", True, [(2016, "Bank Teller", "43-3071.00"), (2020, "Customer Service Executive", "43-4051.00"), (2024, "Senior Customer Service Executive", "43-4051.00")]),
    ("m05", "Ravi Chandran", "M", "30-39", "Customer Service", "m03", "experienced", True, [(2019, "Customer Service Executive", "43-4051.00")]),
    ("m06", "Tan Jia Hui", "F", "20-29", "Customer Service", "m03", "fresh", True, [(2022, "Customer Service Intern", "43-4051.00"), (2023, "Customer Service Executive", "43-4051.00")]),
    ("m07", "Muhammad Irfan Zaki", "M", "20-29", "Customer Service", "m03", "fresh", True, [(2023, "Customer Service Executive", "43-4051.00")]),
    ("m08", "Kavitha Raman", "F", "20-29", "Customer Service", "m03", "fresh", True, [(2024, "Customer Service Executive", "43-4051.00")]),
    ("m09", "Wong Kah Wai", "M", "20-29", "Customer Service", "m03", "fresh", True, [(2025, "Customer Service Intern", "43-4051.00"), (2026, "Customer Service Executive", "43-4051.00")]),
    ("m10", "Ahmad Faizal Osman", "M", "40-49", "Branch Operations", "m02", "experienced", True, [(2010, "Bank Teller", "43-3071.00"), (2015, "Operations Supervisor", "43-1011.00")]),
    ("m11", "Chong Wei Lun", "M", "30-39", "Branch Operations", "m10", "fresh", True, [(2017, "Bank Teller", "43-3071.00")]),
    ("m12", "Nur Syafiqah Azmi", "F", "20-29", "Branch Operations", "m10", "fresh", True, [(2022, "Bank Teller", "43-3071.00")]),
    ("m13", "Priya Devi Subramaniam", "F", "20-29", "Branch Operations", "m10", "fresh", True, [(2025, "Bank Teller", "43-3071.00")]),
    ("m14", "Lim Soo Ching", "F", "40-49", "Branch Operations", "m10", "experienced", True, [(2011, "Data Entry Officer", "43-9021.00")]),
    ("m15", "Hafiz Hamdan", "M", "20-29", "Branch Operations", "m10", "fresh", True, [(2023, "Data Entry Officer", "43-9021.00")]),
    ("m16", "Rosnah Ismail", "F", "50+", "Branch Operations", "m10", "experienced", True, [(2009, "Receptionist", "43-4171.00"), (2016, "Administrative Executive", "43-6014.00")]),
    ("m17", "Daniel Ong", "M", "20-29", "Branch Operations", "m10", "fresh", True, [(2026, "Administrative Assistant", "43-6014.00")]),
    ("m18", "Goh Siew Peng", "F", "40-49", "Finance", "m01", "experienced", True, [(2013, "Accountant", "13-2011.00"), (2019, "Finance Manager", "11-3031.00")]),
    ("m19", "Mohd Khairul Anuar", "M", "30-39", "Finance", "m18", "fresh", True, [(2018, "Accounts Clerk", "43-3031.00"), (2022, "Accountant", "13-2011.00")]),
    ("m20", "Jessica Teoh", "F", "20-29", "Finance", "m18", "experienced", True, [(2024, "Accountant", "13-2011.00")]),
    ("m21", "Zainab Yusof", "F", "40-49", "Finance", "m18", "experienced", True, [(2012, "Accounts Clerk", "43-3031.00")]),
    ("m22", "Arjun Pillai", "M", "20-29", "Finance", "m18", "fresh", True, [(2025, "Accounts Clerk", "43-3031.00")]),
    ("m23", "Farah Nadia Rosli", "F", "30-39", "Finance", "m18", "experienced", True, [(2020, "Accountant", "13-2011.00"), (2025, "Financial Analyst", "13-2051.00")]),
    ("m24", "Kumar Selvam", "M", "40-49", "Technology", "m01", "experienced", True, [(2015, "Software Developer", "15-1252.00"), (2021, "IT Manager", "11-3021.00")]),
    ("m25", "Aiman Hakimi", "M", "20-29", "Technology", "m24", "fresh", True, [(2021, "Software Developer Intern", "15-1252.00"), (2022, "Junior Software Developer", "15-1252.00"), (2025, "Senior Software Developer", "15-1252.00")]),
    ("m26", "Chen Xin Yi", "F", "20-29", "Technology", "m24", "fresh", True, [(2023, "Software Developer Intern", "15-1252.00"), (2024, "Junior Software Developer", "15-1252.00")]),
    ("m27", "Haziq Firdaus", "M", "20-29", "Technology", "m24", "fresh", True, [(2026, "Software Developer Intern", "15-1252.00")]),
    ("m28", "Lau Kok Meng", "M", "30-39", "Technology", "m24", "experienced", True, [(2016, "IT Support Engineer", "15-1232.00"), (2023, "Information Security Analyst", "15-1212.00")]),
    ("m29", "Nadia Izzati", "F", "20-29", "Technology", "m24", "fresh", True, [(2022, "IT Support Engineer", "15-1232.00")]),
    ("m30", "Ryan Tan", "M", "30-39", "Technology", "m24", "fresh", True, [(2019, "Data Entry Officer", "43-9021.00"), (2022, "Data / BI Analyst", "15-2051.01")]),
    ("m31", "Sarah Lim", "F", "40-49", "Marketing", "m01", "experienced", True, [(2014, "Marketing Executive", "13-1161.00"), (2020, "Head of Marketing", "11-2021.00")]),
    ("m32", "Alya Natasha", "F", "20-29", "Marketing", "m31", "fresh", True, [(2022, "Marketing Executive", "13-1161.00")]),
    ("m33", "Benjamin Yeoh", "M", "20-29", "Marketing", "m31", "experienced", True, [(2024, "Graphic Designer", "27-1024.00")]),
    ("m34", "Amirul Hakim", "M", "20-29", "Marketing", "m31", "fresh", True, [(2026, "Digital Marketing Intern", "13-1161.00")]),
    ("m35", "Norhayati Abdullah", "F", "50+", "People & HR", "m01", "experienced", True, [(2010, "HR Executive", "13-1071.00"), (2018, "Head of People", "11-3121.00")]),
    ("m36", "Grace Chua", "F", "30-39", "People & HR", "m35", "experienced", True, [(2017, "HR Executive", "13-1071.00")]),
    ("m37", "Imran Shah", "M", "30-39", "People & HR", "m35", "experienced", True, [(2019, "HR Executive", "13-1071.00"), (2024, "Training & Development Specialist", "13-1151.00")]),
]

DEPARTMENTS = ["Leadership", "Customer Service", "Branch Operations", "Finance", "Technology", "Marketing", "People & HR"]


def skills_for(history, entry, joined):
    """Skills of the current job, plus what earlier jobs left behind; newcomers start a level lower."""
    current = history[-1][2]
    skills = dict(SKILLS[current])
    for _, _, soc in history[:-1]:
        for skill, level in SKILLS[soc].items():
            skills[skill] = max(skills.get(skill, 0), min(level, 2))
    if NOW - joined <= 1:
        skills = {skill: max(1, level - 1) for skill, level in skills.items()}
    return dict(sorted(skills.items(), key=lambda item: (-item[1], item[0])))


employees = []
for pid, name, gender, age, dept, manager, entry, consent, history in PEOPLE:
    joined = history[0][0]
    employees.append(
        {
            "id": pid,
            "name": name,
            "title": history[-1][1],
            "soc": history[-1][2],
            "dept": dept,
            "managerId": manager,
            "gender": gender,
            "ageBand": age,
            "years": NOW - joined + (3 if entry == "experienced" else 0),
            "consent": consent,
            "skills": skills_for(history, entry, joined),
            "joined": joined,
            "entry": entry,
            "history": [{"year": year, "title": title, "soc": soc} for year, title, soc in history],
        }
    )

out = {
    "_about": "Illustrative demo data for the hackathon. The organisation is labelled 'Maybank, Kuala Lumpur' for the demo, but every person, name, career history and skill is invented and does not come from Maybank. 'consent' marks people who chose to share their individual profile with HR. Gender and age band are used only to audit fairness, never as matching inputs.",
    "organisation": {"name": "Maybank", "location": "Kuala Lumpur", "sector": "Banking & financial services", "note": "Demo data — not real Maybank staff"},
    "departments": DEPARTMENTS,
    "employees": employees,
}
target = ROOT / "data" / "curated" / "org-maybank.json"
target.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
counts = {year: sum(1 for e in employees if e["joined"] <= year) for year in range(2022, NOW + 1)}
print(f"wrote {target.relative_to(ROOT)}: {len(employees)} people, {len({e['title'] for e in employees})} titles, headcount by year {counts}")
