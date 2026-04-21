from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, APITestCase

from . import views as api_views
from .models import PendingChange
from .permissions import IsSupervisor, is_supervisor


User = get_user_model()


class TestAuthAndPermissions(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass1234")

    def test_can_get_jwt_token(self):
        url = reverse("token_obtain_pair")
        resp = self.client.post(url, {"username": "testuser", "password": "testpass1234"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

    def test_anonymous_cannot_create_patient(self):
        resp = self.client.post(
            "/api/patients/",
            {
                "patient_id": "PTEST01",
                "age": 30,
                "gender": "Male",
                "weight_kg": "80.0",
                "height_cm": "180.0",
                "bmi_calculated": "24.7",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_can_access_schema(self):
        token_resp = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "testuser", "password": "testpass1234"},
            format="json",
        )
        access = token_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        resp = self.client.get("/api/schema/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class TestMeView(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="alicepass1234")
        self.supervisor = User.objects.create_user(username="bob", password="bobpass1234")
        group, _ = Group.objects.get_or_create(name="supervisors")
        self.supervisor.groups.add(group)

    def test_anonymous_denied(self):
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["username"], "alice")
        self.assertFalse(resp.data["is_supervisor"])
        self.assertFalse(resp.data["is_superuser"])

    def test_supervisor(self):
        self.client.force_authenticate(self.supervisor)
        resp = self.client.get("/api/auth/me/")
        self.assertTrue(resp.data["is_supervisor"])
        self.assertIn("supervisors", resp.data["groups"])

    def test_superuser_is_supervisor(self):
        su = User.objects.create_superuser(
            username="root", password="rootpass1234", email="r@r.tld"
        )
        self.client.force_authenticate(su)
        resp = self.client.get("/api/auth/me/")
        self.assertTrue(resp.data["is_supervisor"])


class TestIsSupervisorHelper(APITestCase):
    def test_anonymous_is_not_supervisor(self):
        class Anon:
            is_authenticated = False
        self.assertFalse(is_supervisor(Anon()))
        self.assertFalse(is_supervisor(None))

    def test_permission_class_denies_anonymous(self):
        from django.contrib.auth.models import AnonymousUser
        perm = IsSupervisor()
        req = APIRequestFactory().get("/x")
        req.user = AnonymousUser()
        self.assertFalse(perm.has_permission(req, None))

    def test_permission_class_allows_supervisor(self):
        perm = IsSupervisor()
        req = APIRequestFactory().get("/x")
        user = User.objects.create_user(username="sup", password="pw1234")
        group, _ = Group.objects.get_or_create(name="supervisors")
        user.groups.add(group)
        req.user = user
        self.assertTrue(perm.has_permission(req, None))


class TestApprovalWorkflowQueueing(APITestCase):
    """Les non-superviseurs ne peuvent pas muter directement la base.

    On mocke ``get_object`` parce que les tables ETL sont ``managed=False``
    (pas créées dans le schéma de test Django).
    """

    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="alicepass1234")
        self.supervisor = User.objects.create_user(username="bob", password="bobpass1234")
        group, _ = Group.objects.get_or_create(name="supervisors")
        self.supervisor.groups.add(group)

    def _mock_patient(self):
        mock = MagicMock()
        mock.patient_id = "P0001"
        mock.pk = "P0001"
        return mock

    def test_regular_user_patch_creates_pending_change(self):
        self.client.force_authenticate(self.user)
        with patch.object(api_views.PatientViewSet, "get_object", return_value=self._mock_patient()):
            resp = self.client.patch(
                "/api/patients/P0001/", {"age": 42}, format="json"
            )
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(PendingChange.objects.count(), 1)
        pc = PendingChange.objects.first()
        self.assertEqual(pc.table_name, "patient")
        self.assertEqual(pc.record_id, "P0001")
        self.assertEqual(pc.operation, "update")
        self.assertEqual(pc.changes, {"age": 42})
        self.assertEqual(pc.status, "pending")
        self.assertEqual(pc.requested_by, self.user)

    def test_regular_user_put_creates_pending_change(self):
        self.client.force_authenticate(self.user)
        with patch.object(api_views.PatientViewSet, "get_object", return_value=self._mock_patient()):
            resp = self.client.put(
                "/api/patients/P0001/", {"age": 50, "gender": "M"}, format="json"
            )
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(PendingChange.objects.count(), 1)

    def test_regular_user_delete_creates_pending_change(self):
        self.client.force_authenticate(self.user)
        with patch.object(api_views.PatientViewSet, "get_object", return_value=self._mock_patient()):
            resp = self.client.delete("/api/patients/P0001/")
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        pc = PendingChange.objects.first()
        self.assertEqual(pc.operation, "delete")

    def test_regular_user_cannot_create(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            "/api/patients/",
            {
                "patient_id": "P9999",
                "age": 30,
                "gender": "M",
                "weight_kg": "80.0",
                "height_cm": "180.0",
                "bmi_calculated": "24.7",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class TestApplyPending(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw1234")

    def test_unknown_table_raises(self):
        pending = PendingChange.objects.create(
            table_name="unknown_table",
            record_id="X",
            operation="update",
            changes={},
            requested_by=self.user,
        )
        with self.assertRaises(ValidationError):
            api_views._apply_pending(pending)

    def test_missing_row_raises(self):
        pending = PendingChange.objects.create(
            table_name="patient",
            record_id="P_DOES_NOT_EXIST",
            operation="update",
            changes={"age": 42},
            requested_by=self.user,
        )
        # Patient table (managed=False) n'existe pas en test, donc `.get()`
        # lève DatabaseError ; on mocke le manager pour simuler DoesNotExist.
        fake_manager = MagicMock()
        fake_manager.get.side_effect = api_views.Patient.DoesNotExist()
        with patch.object(api_views.Patient, "objects", fake_manager):
            with self.assertRaises(ValidationError):
                api_views._apply_pending(pending)

    def test_update_applies_allowed_fields(self):
        pending = PendingChange.objects.create(
            table_name="patient",
            record_id="P0001",
            operation="update",
            changes={"age": 42, "not_a_field": "ignored"},
            requested_by=self.user,
        )
        instance = MagicMock()
        fake_manager = MagicMock()
        fake_manager.get.return_value = instance
        with patch.object(api_views.Patient, "objects", fake_manager):
            api_views._apply_pending(pending)
        instance.save.assert_called_once()

    def test_delete_operation(self):
        pending = PendingChange.objects.create(
            table_name="patient",
            record_id="P0001",
            operation="delete",
            changes={},
            requested_by=self.user,
        )
        instance = MagicMock()
        fake_manager = MagicMock()
        fake_manager.get.return_value = instance
        with patch.object(api_views.Patient, "objects", fake_manager):
            api_views._apply_pending(pending)
        instance.delete.assert_called_once()


class TestPendingChangeViewSet(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw1234")
        self.other = User.objects.create_user(username="eve", password="pw1234")
        self.supervisor = User.objects.create_user(username="bob", password="pw1234")
        group, _ = Group.objects.get_or_create(name="supervisors")
        self.supervisor.groups.add(group)

        self.pc_alice = PendingChange.objects.create(
            table_name="patient",
            record_id="P0001",
            operation="update",
            changes={"age": 42},
            requested_by=self.user,
        )
        self.pc_eve = PendingChange.objects.create(
            table_name="sante",
            record_id="P0002",
            operation="update",
            changes={"cholesterol": 200},
            requested_by=self.other,
        )

    def test_anonymous_cannot_list(self):
        resp = self.client.get("/api/pending-changes/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_sees_only_own_changes(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/pending-changes/")
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get("results", resp.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.pc_alice.id, ids)
        self.assertNotIn(self.pc_eve.id, ids)

    def test_supervisor_sees_all(self):
        self.client.force_authenticate(self.supervisor)
        resp = self.client.get("/api/pending-changes/")
        results = resp.data.get("results", resp.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.pc_alice.id, ids)
        self.assertIn(self.pc_eve.id, ids)

    def test_status_filter(self):
        self.client.force_authenticate(self.supervisor)
        resp = self.client.get("/api/pending-changes/?status=pending")
        self.assertEqual(resp.status_code, 200)
        resp2 = self.client.get("/api/pending-changes/?status=approved")
        results2 = resp2.data.get("results", resp2.data)
        self.assertEqual(len(results2), 0)

    def test_regular_user_cannot_approve(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(f"/api/pending-changes/{self.pc_alice.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_approve(self):
        self.client.force_authenticate(self.supervisor)
        instance = MagicMock()
        fake_manager = MagicMock()
        fake_manager.get.return_value = instance
        with patch.object(api_views.Patient, "objects", fake_manager):
            resp = self.client.post(
                f"/api/pending-changes/{self.pc_alice.id}/approve/",
                {"comment": "OK confirmé"},
                format="json",
            )
        self.assertEqual(resp.status_code, 200)
        self.pc_alice.refresh_from_db()
        self.assertEqual(self.pc_alice.status, "approved")
        self.assertEqual(self.pc_alice.reviewed_by, self.supervisor)
        self.assertEqual(self.pc_alice.review_comment, "OK confirmé")
        self.assertIsNotNone(self.pc_alice.reviewed_at)
        instance.save.assert_called_once()

    def test_supervisor_reject(self):
        self.client.force_authenticate(self.supervisor)
        resp = self.client.post(
            f"/api/pending-changes/{self.pc_alice.id}/reject/",
            {"comment": "Valeur incohérente"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.pc_alice.refresh_from_db()
        self.assertEqual(self.pc_alice.status, "rejected")
        self.assertEqual(self.pc_alice.review_comment, "Valeur incohérente")

    def test_approve_twice_returns_400(self):
        self.pc_alice.status = "approved"
        self.pc_alice.save()
        self.client.force_authenticate(self.supervisor)
        resp = self.client.post(f"/api/pending-changes/{self.pc_alice.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_already_rejected_returns_400(self):
        self.pc_alice.status = "rejected"
        self.pc_alice.save()
        self.client.force_authenticate(self.supervisor)
        resp = self.client.post(f"/api/pending-changes/{self.pc_alice.id}/reject/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pending_change_str(self):
        self.assertIn("patient", str(self.pc_alice))
        self.assertIn("pending", str(self.pc_alice))


class TestSupervisorBypass(APITestCase):
    """Un superviseur déclenche le comportement standard DRF (update direct)."""

    def setUp(self):
        self.supervisor = User.objects.create_user(username="bob", password="pw1234")
        group, _ = Group.objects.get_or_create(name="supervisors")
        self.supervisor.groups.add(group)

    def test_supervisor_patch_does_not_queue(self):
        self.client.force_authenticate(self.supervisor)
        mock_instance = MagicMock()
        mock_instance.patient_id = "P0001"
        mock_serializer = MagicMock()
        mock_serializer.is_valid.return_value = True
        mock_serializer.data = {"patient_id": "P0001", "age": 42}
        with (
            patch.object(api_views.PatientViewSet, "get_object", return_value=mock_instance),
            patch.object(api_views.PatientViewSet, "get_serializer", return_value=mock_serializer),
        ):
            resp = self.client.patch("/api/patients/P0001/", {"age": 42}, format="json")
        # Le superviseur passe dans la branche DRF native : pas de PendingChange créée.
        self.assertEqual(PendingChange.objects.count(), 0)
        self.assertEqual(resp.status_code, 200)


class TestKPIViewsUnit(APITestCase):
    def test_model_str_methods(self):
        from .models import Patient, Sante, Nutrition, ActivitePhysique, GymSession

        p = Patient(patient_id="P00001", age=30, gender="Male", weight_kg=80, height_cm=180, bmi_calculated=24.7)
        self.assertIn("P00001", str(p))
        self.assertIn("P00001", str(Sante(patient=p)))
        self.assertIn("P00001", str(Nutrition(patient=p)))
        self.assertIn("P00001", str(ActivitePhysique(patient=p)))
        self.assertIn("P00001", str(GymSession(id=1, patient=p)))

    def test_kpi_views_return_expected_shape_with_mocks(self):
        rf = APIRequestFactory()
        req = rf.get("/api/kpis/")

        with (
            patch.object(api_views.Patient, "objects") as patient_mgr,
            patch.object(api_views.Sante, "objects") as sante_mgr,
            patch.object(api_views.Nutrition, "objects") as nut_mgr,
            patch.object(api_views.ActivitePhysique, "objects") as act_mgr,
            patch.object(api_views.GymSession, "objects") as gym_mgr,
        ):
            sante_mgr.values.return_value.annotate.return_value = [{"disease_type": "X", "count": 1}]
            sante_mgr.aggregate.return_value = {"cholesterol__avg": 180}
            sante_mgr.values.return_value.annotate.return_value = [{"severity": "Low", "count": 1}]
            nut_mgr.aggregate.return_value = {"daily_caloric_intake__avg": 2000}
            act_mgr.aggregate.return_value = {"weekly_exercice_hours__avg": 3.5}
            act_mgr.values.return_value.annotate.return_value = [{"physical_activity_level": "Active", "count": 1}]
            gym_mgr.aggregate.return_value = {"gym_calories_burned__avg": 500}
            gym_mgr.values.return_value.annotate.return_value = [{"gym_workout_type": "Cardio", "count": 1}]
            patient_mgr.count.return_value = 10
            patient_mgr.aggregate.side_effect = [
                {"age__avg": 30},
                {"bmi_calculated__avg": 24.0},
            ]

            resp = api_views.KPIView.as_view()(req)
            self.assertEqual(resp.status_code, 200)
            self.assertIn("total_patients", resp.data)
            self.assertIn("sante", resp.data)

            req2 = rf.get("/api/engagement/")
            patient_mgr.count.return_value = 10
            gym_mgr.values.return_value.distinct.return_value.count.return_value = 5
            gym_mgr.count.return_value = 20
            resp2 = api_views.EngagementKPIView.as_view()(req2)
            self.assertEqual(resp2.status_code, 200)
            self.assertIn("engagement_rate", resp2.data)

            req3 = rf.get("/api/conversion/")
            nut_mgr.count.return_value = 10
            act_mgr.count.return_value = 10
            nut_mgr.filter.return_value.count.return_value = 2
            act_mgr.filter.return_value.count.return_value = 3
            resp3 = api_views.ConversionKPIView.as_view()(req3)
            self.assertEqual(resp3.status_code, 200)
            self.assertIn("avg_conversion", resp3.data)

            req4 = rf.get("/api/satisfaction/")
            patient_mgr.count.return_value = 10
            sante_mgr.filter.return_value.count.side_effect = [5, 6, 7]
            resp4 = api_views.SatisfactionKPIView.as_view()(req4)
            self.assertEqual(resp4.status_code, 200)
            self.assertIn("overall_satisfaction_score", resp4.data)

            req5 = rf.get("/api/data-quality/")
            patient_mgr.count.return_value = 10
            sante_mgr.exclude.return_value.count.return_value = 8
            nut_mgr.exclude.return_value.count.return_value = 9
            act_mgr.exclude.return_value.count.return_value = 7
            sante_mgr.count.return_value = 10
            nut_mgr.count.return_value = 10
            act_mgr.count.return_value = 10
            gym_mgr.count.return_value = 10
            resp5 = api_views.DataQualityKPIView.as_view()(req5)
            self.assertEqual(resp5.status_code, 200)
            self.assertIn("overall_data_quality", resp5.data)
