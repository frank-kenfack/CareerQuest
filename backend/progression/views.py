from django.db import connections
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    default_connection = connections["default"]
    try:
        default_connection.cursor()
    except OperationalError:
        return Response(
            {
                "status": "degraded",
                "service": "careerquest-backend",
                "database": "unreachable",
                "database_engine": default_connection.vendor,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "status": "ok",
            "service": "careerquest-backend",
            "database": "connected",
            "database_engine": default_connection.vendor,
        },
        status=status.HTTP_200_OK,
    )
