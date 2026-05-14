from extension import db, mail
from flask_mail import Message
from openpyxl import Workbook
from datetime import datetime
from models.user_model import User
from models.school_model import School
from models.test_result_model import TestResult
import os


def send_daily_quiz_report(app):

    with app.app_context():

        print("Running daily report...")

        today = datetime.utcnow().date()

        schools = School.query.all()

        for school in schools:

            classes = db.session.execute(
                db.text("""
                    SELECT DISTINCT student_class
                    FROM users
                    WHERE school_id=:school
                    AND student_class IS NOT NULL
                """),
                {"school": school.id}
            ).fetchall()

            for c in classes:

                class_id = c[0]

                students = User.query.filter_by(
                    school_id=school.id,
                    student_class=class_id,
                    position=2
                ).all()

                student_ids = [s.id for s in students]

                if not student_ids:
                    continue

                results = TestResult.query.filter(
                    TestResult.user_id.in_(student_ids),
                    db.func.date(TestResult.taken_at) == today
                ).all()

                attended_ids = set(
                    r.user_id for r in results
                )

                absent_students = [
                    s for s in students
                    if s.id not in attended_ids
                ]

                wb = Workbook()

                # Sheet 1
                ws1 = wb.active
                ws1.title = "Not Attended"

                ws1.append(["Student Name"])

                for s in absent_students:
                    ws1.append([s.name])

                # Sheet 2
                ws2 = wb.create_sheet(
                    "Attended"
                )

                ws2.append([
                    "Student Name",
                    "Score %",
                    "Correct",
                    "Total"
                ])

                for r in results:

                    user = User.query.get(
                        r.user_id
                    )

                    ws2.append([
                        user.name,
                        r.score_percent,
                        r.correct_answers,
                        r.total_questions
                    ])

                # Sheet 3 Summary
                total_students = len(students)

                attended_count = len(
                    attended_ids
                )

                attendance_percent = round(
                    (
                        attended_count /
                        total_students
                    ) * 100,
                    1
                ) if total_students else 0

                ws3 = wb.create_sheet(
                    "Summary"
                )

                ws3.append([
                    "Total Students",
                    total_students
                ])

                ws3.append([
                    "Attended",
                    attended_count
                ])

                ws3.append([
                    "Not Attended",
                    len(absent_students)
                ])

                ws3.append([
                    "Attendance %",
                    attendance_percent
                ])

                filename = (
                    f"report_"
                    f"{school.id}_"
                    f"{class_id}.xlsx"
                )

                wb.save(filename)

                print(
                    "Saved:",
                    filename
                )

                teachers = User.query.filter_by(
                    school_id=school.id,
                    student_class=class_id,
                    position=3
                ).all()

                emails = [
                    t.email
                    for t in teachers
                    if t.email
                ]

                try:

                    if emails:

                        msg = Message(
                            subject=f"Daily Quiz Report Class {class_id}",
                            recipients=emails
                        )

                        msg.body = f"""
Daily Quiz Summary

Total Students:
{total_students}

Attended:
{attended_count}

Not Attended:
{len(absent_students)}

Attendance:
{attendance_percent}%
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

                        print(
                            "Mail sent:",
                            emails
                        )

                except Exception as e:

                    print(
                        "Mail error:",
                        str(e)
                    )

                finally:

                    if os.path.exists(
                        filename
                    ):

                        os.remove(
                            filename
                        )

                        print(
                            "Temp file removed"
                        )

        print(
            "Daily report completed"
        )