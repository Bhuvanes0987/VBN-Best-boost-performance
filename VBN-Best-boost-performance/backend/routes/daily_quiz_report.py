from extension import db, mail
from flask_mail import Message
from openpyxl import Workbook
from datetime import datetime
from models.user_model import User
from models.school_model import School
from models.test_result_model import TestResult
import os
from utils.email_logger import log_email


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

                ws1 = wb.active
                ws1.title = "Daily Test Report"

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

                ws1.append([
                    "Class",
                    class_id
                ])

                ws1.append([
                    "Total Students",
                    total_students
                ])

                ws1.append([
                    "Attended",
                    attended_count
                ])

                ws1.append([
                    "Not Attended",
                    len(absent_students)
                ])

                ws1.append([
                    "Attendance %",
                    f"{attendance_percent}%"
                ])

                ws1.append([])
                ws1.append([
                    "Not Attended Students"
                ])
                ws1.append([
                    "Student Name"
                ])

                for s in absent_students:
                    ws1.append([
                        s.name
                    ])

                ws1.append([])
                ws1.append([
                    "Attended Students"
                ])
                ws1.append([
                    "Student Name",
                    "Score %",
                    "Correct",
                    "Total"
                ])

                for r in results:

                    user = User.query.get(
                        r.user_id
                    )

                    if not user:
                        continue

                    ws1.append([
                        user.name,
                        r.score_percent,
                        r.correct_answers,
                        r.total_questions
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

                # Find teachers who teach at least one subject in this class
                all_teachers = User.query.filter_by(
                    school_id=school.id,
                    position=3
                ).all()

                subjects_in_class = db.session.execute(
                    db.text("SELECT subject_id FROM subject_classes WHERE class_id=:c"),
                    {"c": class_id}
                ).fetchall()
                subject_ids_in_class = {row[0] for row in subjects_in_class}

                emails = []
                for t in all_teachers:
                    if not t.email:
                        continue
                    
                    try:
                        teacher_subjects_json = str(t.selected_subjects).strip()
                        if not teacher_subjects_json:
                            continue
                            
                        import json
                        try:
                            parsed = json.loads(teacher_subjects_json)
                            if isinstance(parsed, list):
                                teacher_subject_ids = {int(x) for x in parsed if str(x).strip()}
                            else:
                                teacher_subject_ids = {int(x.strip()) for x in str(teacher_subjects_json).split(",") if x.strip().isdigit()}
                        except json.JSONDecodeError:
                            teacher_subject_ids = {int(x.strip()) for x in teacher_subjects_json.split(",") if x.strip().isdigit()}
                    except Exception:
                        teacher_subject_ids = set()

                    if teacher_subject_ids.intersection(subject_ids_in_class):
                        emails.append(t.email)

                try:

                    if emails:

                        msg = Message(
                            subject=f"Daily Test ({school.name})",
                            recipients=emails
                        )

                        msg.body = f"""
Respected Teacher,

We hope this message finds you well.

We are pleased to inform you that the marks obtained by students in today's daily test have been compiled and are now available for your review.

Please find the result Excel attached for your reference.

Class: {class_id}
Total Students: {total_students}
Attended: {attended_count}
Not Attended: {len(absent_students)}
Attendance: {attendance_percent}%

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

                        print(
                            "Mail sent:",
                            emails
                        )
                        log_email(emails, "Daily Test Report", "Success")

                except Exception as e:

                    print(
                        "Mail error:",
                        str(e)
                    )
                    log_email(emails, "Daily Test Report", "Failed", error=str(e))

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