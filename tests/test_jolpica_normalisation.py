from f1_jolpica.importer import normalise_event, normalise_results


def test_normalise_jolpica_event_and_results() -> None:
    event = normalise_event(
        2025,
        {
            "round": "1",
            "raceName": "Example Grand Prix",
            "date": "2025-03-16",
            "Circuit": {
                "circuitId": "example",
                "circuitName": "Example Circuit",
                "Location": {"locality": "Example City", "country": "Example Country"},
            },
        },
    )
    results = normalise_results(
        {
            "Results": [
                {
                    "position": "1",
                    "positionText": "1",
                    "points": "25",
                    "grid": "2",
                    "laps": "58",
                    "status": "Finished",
                    "Driver": {
                        "driverId": "driver",
                        "givenName": "Test",
                        "familyName": "Driver",
                        "code": "TST",
                    },
                    "Constructor": {"constructorId": "team", "name": "Test Team"},
                    "FastestLap": {"rank": "1", "Time": {"time": "1:20.000"}},
                }
            ]
        }
    )

    assert event.circuit_id == "example"
    assert event.round_number == 1
    assert results[0].driver_name == "Test Driver"
    assert results[0].fastest_lap_time == "1:20.000"
