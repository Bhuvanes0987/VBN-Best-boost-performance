from extension import db,mail
from flask_mail import Message
from openpyxl import Workbook
from models.user_model import User
from models.subject_model import Subject
from models.test_result_model import TestResult
from models.school_model import School
from datetime import datetime
from zoneinfo import ZoneInfo
import os


def send_subject_quiz_report(app):

    with app.app_context():

        today=datetime.now(
            ZoneInfo(
                "Asia/Kolkata"
            )
        ).date()

        teachers=User.query.filter_by(
            position=3
        ).all()

        for teacher in teachers:

            if not teacher.selected_subjects:
                continue

            ids=[
                int(x)
                for x in
                teacher.selected_subjects
                .split(",")
                if x.strip()
            ]

            for subject_id in ids:

                subject=Subject.query.get(
                    subject_id
                )

                results=(
                    TestResult.query
                    .filter(
                        TestResult.subject_id
                        ==subject_id,

                        TestResult.test_type
                        =="subject",

                        db.func.date(
                            TestResult.taken_at
                        )==today
                    )
                    .all()
                )

                if not results:
                    continue

                wb=Workbook()

                ws1=wb.active
                ws1.title="Attended"

                ws1.append([
                    "Student",
                    "Score %",
                    "Correct",
                    "Total"
                ])

                attended=[]

                for r in results:

                    user=User.query.get(
                        r.user_id
                    )

                    if not user:
                        continue

                    attended.append(
                        user.id
                    )

                    ws1.append([

                        user.name,
                        r.score_percent,
                        r.correct_answers,
                        r.total_questions

                    ])

                ws2=wb.create_sheet(
                    "Not Attended"
                )

                ws2.append([
                    "Student"
                ])

                students=User.query.filter_by(
                    school_id=
                    teacher.school_id,

                    position=2
                ).all()

                for s in students:

                    if s.id not in attended:

                        ws2.append([
                            s.name
                        ])

                ws3=wb.create_sheet(
                    "Summary"
                )

                ws3.append([
                    "Subject",
                    subject.subject_name
                ])

                ws3.append([
                    "Attended",
                    len(attended)
                ])

                filename=(
                    f"subject_"
                    f"{subject.id}.xlsx"
                )

                wb.save(
                    filename
                )

                school=School.query.get(
                    teacher.school_id
                )

                school_name=(
                    school.name
                    if school else "School"
                )

                msg=Message(
                    subject=
                    f"Subject Test ({school_name})",

                    recipients=[
                        teacher.email
                    ]
                )

                msg.body=f"""
Respected Teacher,

We hope this message finds you well.

We are pleased to inform you that the marks obtained by students in today's subject test have been compiled and are now available for your review.

Thank you for your continued support and dedication.

Yours sincerely,
VBN Boost Performance Team
"""

                with open(
                    filename,
                    "rb"
                ) as fp:

                    msg.attach(
                        filename,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        fp.read()
                    )

                mail.send(msg)

                os.remove(
                    filename
                )