<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class AggregateTest extends TestCase
{
    // ────────────────────────────────────────────────
    // calc_total
    // ────────────────────────────────────────────────

    public function test_calc_total_returns_zeros_for_empty_codes(): void
    {
        $rows = [
            '01101' => ['area' => 100.0, 'population' => 200000, 'furusato_amount' => 5000000, 'furusato_count' => 300],
        ];

        $result = calc_total($rows, []);

        $this->assertSame(0.0,  $result['area']);
        $this->assertSame(0,    $result['population']);
        $this->assertSame(0,    $result['furusato_amount']);
        $this->assertSame(0,    $result['furusato_count']);
    }

    public function test_calc_total_sums_single_municipality(): void
    {
        $rows = [
            '01101' => ['area' => 100.0, 'population' => 200000, 'furusato_amount' => 5000000, 'furusato_count' => 300],
        ];

        $result = calc_total($rows, ['01101']);

        $this->assertSame(100.0,   $result['area']);
        $this->assertSame(200000,  $result['population']);
        $this->assertSame(5000000, $result['furusato_amount']);
        $this->assertSame(300,     $result['furusato_count']);
    }

    public function test_calc_total_sums_multiple_municipalities(): void
    {
        $rows = [
            '01101' => ['area' => 100.0, 'population' => 200000, 'furusato_amount' => 5000000, 'furusato_count' => 300],
            '01102' => ['area' =>  50.0, 'population' =>  80000, 'furusato_amount' => 2000000, 'furusato_count' => 100],
        ];

        $result = calc_total($rows, ['01101', '01102']);

        $this->assertSame(150.0,   $result['area']);
        $this->assertSame(280000,  $result['population']);
        $this->assertSame(7000000, $result['furusato_amount']);
        $this->assertSame(400,     $result['furusato_count']);
    }

    public function test_calc_total_skips_unknown_codes(): void
    {
        $rows = [
            '01101' => ['area' => 100.0, 'population' => 200000, 'furusato_amount' => 5000000, 'furusato_count' => 300],
        ];

        $result = calc_total($rows, ['01101', '99999']);

        $this->assertSame(100.0,   $result['area']);
        $this->assertSame(200000,  $result['population']);
        $this->assertSame(5000000, $result['furusato_amount']);
        $this->assertSame(300,     $result['furusato_count']);
    }

    public function test_calc_total_returns_zeros_when_all_codes_unknown(): void
    {
        $rows = [];

        $result = calc_total($rows, ['01101']);

        $this->assertSame(0.0, $result['area']);
        $this->assertSame(0,   $result['population']);
        $this->assertSame(0,   $result['furusato_amount']);
        $this->assertSame(0,   $result['furusato_count']);
    }

    public function test_calc_total_double_counts_when_same_code_appears_twice(): void
    {
        $rows = [
            '01101' => ['area' => 100.0, 'population' => 200000, 'furusato_amount' => 5000000, 'furusato_count' => 300],
        ];

        $result = calc_total($rows, ['01101', '01101']);

        // 同一コードを 2 回渡すと 2 倍になる（呼び出し側で重複を除去する責務）
        $this->assertSame(200.0,    $result['area']);
        $this->assertSame(400000,   $result['population']);
        $this->assertSame(10000000, $result['furusato_amount']);
        $this->assertSame(600,      $result['furusato_count']);
    }

    // ────────────────────────────────────────────────
    // calc_percentages
    // ────────────────────────────────────────────────

    public function test_calc_percentages_returns_correct_values(): void
    {
        $sum   = ['area' => 50.0, 'population' => 100, 'furusato_amount' => 200, 'furusato_count' => 10];
        $total = ['area' => 200.0, 'population' => 400, 'furusato_amount' => 800, 'furusato_count' => 40];

        $result = calc_percentages($sum, $total);

        $this->assertEqualsWithDelta(25.0, $result['area_pct'],            PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(25.0, $result['population_pct'],      PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(25.0, $result['furusato_amount_pct'], PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(25.0, $result['furusato_count_pct'],  PHP_FLOAT_EPSILON);
    }

    public function test_calc_percentages_returns_100_when_sum_equals_total(): void
    {
        $values = ['area' => 100.0, 'population' => 100, 'furusato_amount' => 100, 'furusato_count' => 100];

        $result = calc_percentages($values, $values);

        $this->assertEqualsWithDelta(100.0, $result['area_pct'],            PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(100.0, $result['population_pct'],      PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(100.0, $result['furusato_amount_pct'], PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(100.0, $result['furusato_count_pct'],  PHP_FLOAT_EPSILON);
    }

    public function test_calc_percentages_returns_zeros_when_sum_is_zero(): void
    {
        $sum   = ['area' => 0.0, 'population' => 0, 'furusato_amount' => 0, 'furusato_count' => 0];
        $total = ['area' => 100.0, 'population' => 100, 'furusato_amount' => 100, 'furusato_count' => 100];

        $result = calc_percentages($sum, $total);

        $this->assertSame(0.0, $result['area_pct']);
        $this->assertSame(0.0, $result['population_pct']);
        $this->assertSame(0.0, $result['furusato_amount_pct']);
        $this->assertSame(0.0, $result['furusato_count_pct']);
    }

    public function test_calc_percentages_returns_zeros_when_total_is_zero(): void
    {
        $sum   = ['area' => 50.0, 'population' => 50, 'furusato_amount' => 50, 'furusato_count' => 50];
        $total = ['area' => 0.0,  'population' => 0,  'furusato_amount' => 0,  'furusato_count' => 0];

        $result = calc_percentages($sum, $total);

        $this->assertSame(0.0, $result['area_pct']);
        $this->assertSame(0.0, $result['population_pct']);
        $this->assertSame(0.0, $result['furusato_amount_pct']);
        $this->assertSame(0.0, $result['furusato_count_pct']);
    }

    public function test_calc_percentages_can_exceed_100_when_sum_exceeds_total(): void
    {
        // sum が total より大きい場合は 100% 超になる（呼び出し側で保証しない）
        $sum   = ['area' => 200.0, 'population' => 200, 'furusato_amount' => 200, 'furusato_count' => 200];
        $total = ['area' => 100.0, 'population' => 100, 'furusato_amount' => 100, 'furusato_count' => 100];

        $result = calc_percentages($sum, $total);

        $this->assertEqualsWithDelta(200.0, $result['area_pct'],            PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(200.0, $result['population_pct'],      PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(200.0, $result['furusato_amount_pct'], PHP_FLOAT_EPSILON);
        $this->assertEqualsWithDelta(200.0, $result['furusato_count_pct'],  PHP_FLOAT_EPSILON);
    }
}
