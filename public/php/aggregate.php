<?php

declare(strict_types=1);

/**
 * @param array<string, array{area: float, population: int, furusato_amount: int, furusato_count: int}> $rows
 * @param list<string> $codes
 * @return array{area: float, population: int, furusato_amount: int, furusato_count: int}
 */
function calc_total(array $rows, array $codes): array
{
    $sum = [
        'area'            => 0.0,
        'population'      => 0,
        'furusato_amount' => 0,
        'furusato_count'  => 0,
    ];

    foreach ($codes as $code) {
        $row = $rows[$code] ?? null;
        if ($row === null) {
            continue;
        }
        $sum['area']            += $row['area'];
        $sum['population']      += $row['population'];
        $sum['furusato_amount'] += $row['furusato_amount'];
        $sum['furusato_count']  += $row['furusato_count'];
    }

    return $sum;
}

/**
 * @param array{area: float, population: int, furusato_amount: int, furusato_count: int} $sum
 * @param array{area: float, population: int, furusato_amount: int, furusato_count: int} $total
 * @return array{area_pct: float, population_pct: float, furusato_amount_pct: float, furusato_count_pct: float}
 */
function calc_percentages(array $sum, array $total): array
{
    $pct = static function (float|int $part, float|int $whole): float {
        return $whole > 0 ? ($part / $whole) * 100.0 : 0.0;
    };

    return [
        'area_pct'            => $pct($sum['area'],            $total['area']),
        'population_pct'      => $pct($sum['population'],      $total['population']),
        'furusato_amount_pct' => $pct($sum['furusato_amount'], $total['furusato_amount']),
        'furusato_count_pct'  => $pct($sum['furusato_count'],  $total['furusato_count']),
    ];
}
